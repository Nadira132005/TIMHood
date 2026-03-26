package com.timhood.app

import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Bundle
import android.os.SystemClock
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import net.sf.scuba.smartcards.CardServiceException
import net.sf.scuba.smartcards.CardService
import net.sf.scuba.smartcards.CommandAPDU
import net.sf.scuba.smartcards.ResponseAPDU
import org.jmrtd.PACEKeySpec
import org.jmrtd.PassportService
import org.jmrtd.lds.ActiveAuthenticationInfo
import org.jmrtd.lds.CardAccessFile
import org.jmrtd.lds.PACEInfo
import org.jmrtd.lds.SODFile
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File
import org.jmrtd.lds.icao.DG11File
import org.jmrtd.lds.icao.DG12File
import org.jmrtd.lds.icao.DG14File
import org.jmrtd.lds.icao.DG15File
import java.io.ByteArrayOutputStream
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.math.BigInteger
import java.security.MessageDigest
import java.security.PublicKey
import java.util.concurrent.Executors

class CeiNativeReaderModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), NfcAdapter.ReaderCallback {
  companion object {
    private const val TAG = "CeiNativeReader"
  }

  private val executor = Executors.newSingleThreadExecutor()
  @Volatile private var pendingPromise: Promise? = null
  @Volatile private var pendingCan: String? = null
  @Volatile private var pendingAaChallenge: ByteArray? = null

  override fun getName(): String = "CeiNativeReader"

  @ReactMethod
  fun readNameWithPace(can: String, promise: Promise) {
    startRead(can, null, promise)
  }

  @ReactMethod
  fun readNameWithPaceAndActiveAuth(can: String, challengeBase64: String, promise: Promise) {
    val challenge =
      try {
        Base64.decode(challengeBase64, Base64.DEFAULT)
      } catch (error: IllegalArgumentException) {
        promise.reject("invalid_aa_challenge", "AA challenge must be base64-encoded.")
        return
      }

    if (challenge.size != 8) {
      promise.reject("invalid_aa_challenge", "AA challenge must decode to exactly 8 bytes.")
      return
    }

    startRead(can, challenge, promise)
  }

  private fun startRead(can: String, aaChallenge: ByteArray?, promise: Promise) {
    if (!Regex("^\\d{6}$").matches(can)) {
      promise.reject("invalid_can", "CAN must have exactly 6 digits.")
      return
    }

    if (pendingPromise != null) {
      promise.reject("reader_busy", "A native reader session is already in progress.")
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "No current Android activity is available.")
      return
    }

    val adapter = NfcAdapter.getDefaultAdapter(activity)
    if (adapter == null) {
      promise.reject("nfc_unavailable", "This Android device does not expose NFC.")
      return
    }

    pendingCan = can
    pendingPromise = promise
    pendingAaChallenge = aaChallenge

    UiThreadUtil.runOnUiThread {
      adapter.enableReaderMode(
        activity,
        this,
        NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
        Bundle().apply {
          putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 250)
        },
      )
    }
  }

  override fun onTagDiscovered(tag: Tag) {
    val promise = pendingPromise ?: return
    val can = pendingCan
    val aaChallenge = pendingAaChallenge
    pendingPromise = null
    pendingCan = null
    pendingAaChallenge = null

    if (can == null) {
      promise.reject("missing_can", "Missing CAN for native reader session.")
      return
    }

    executor.execute {
      try {
        val isoDep = IsoDep.get(tag)
          ?: throw IllegalStateException("The tapped document does not expose IsoDep.")
        isoDep.timeout = 15_000

        val result = readNameOverPace(isoDep, can, aaChallenge)
        promise.resolve(result)
      } catch (error: Throwable) {
        val detailedMessage =
          "${error::class.java.simpleName}: ${error.message ?: "Unknown native PACE failure"}"
        Log.e(TAG, detailedMessage, error)
        promise.reject("native_pace_failed", detailedMessage, error)
      } finally {
        disableReaderMode()
      }
    }
  }

  private fun readNameOverPace(isoDep: IsoDep, can: String, aaChallenge: ByteArray?) = Arguments.createMap().apply {
    val sessionStartedAt = SystemClock.elapsedRealtime()
    val cardService = AndroidIsoDepCardService(isoDep)
    val maxTransceiveLength =
      isoDep.maxTransceiveLength
        .takeIf { it > 0 }
        ?.coerceAtMost(PassportService.EXTENDED_MAX_TRANCEIVE_LENGTH)
        ?: PassportService.NORMAL_MAX_TRANCEIVE_LENGTH
    val passportService =
      PassportService(
        cardService,
        maxTransceiveLength,
        PassportService.DEFAULT_MAX_BLOCKSIZE,
        false,
        true,
      )

    try {
      passportService.open()
      Log.d(TAG, "PassportService.open() succeeded")
      passportService.sendSelectApplet(false)
      Log.d(TAG, "sendSelectApplet(false) succeeded")
      passportService.sendSelectMF()
      Log.d(TAG, "sendSelectMF() succeeded")

      val timings = Arguments.createMap()
      val cardAccessInput = passportService.getInputStream(PassportService.EF_CARD_ACCESS)
      val paceInfo = findPaceInfo(cardAccessInput)
        ?: throw IllegalStateException("No PACE security info was found in EF.CardAccess.")
      Log.d(
        TAG,
        "PACE info selected oid=${paceInfo.objectIdentifier} parameterId=${paceInfo.parameterId}",
      )

      val parameterId = paceInfo.parameterId.toInt()
      val parameterSpec = PACEInfo.toParameterSpec(parameterId)
      val canKey = PACEKeySpec.createCANKey(can)

      passportService.doPACE(
        canKey,
        paceInfo.objectIdentifier,
        parameterSpec,
        BigInteger.valueOf(parameterId.toLong()),
      )
      timings.putDouble("pace", elapsedMillis(sessionStartedAt))
      Log.d(TAG, "doPACE() succeeded")

      passportService.sendSelectApplet(true)
      Log.d(TAG, "sendSelectApplet(true) succeeded")

      val dg1StartedAt = SystemClock.elapsedRealtime()
      val dg1Bytes = readLdsFile(passportService, PassportService.EF_DG1)
      val dg1File = DG1File(ByteArrayInputStream(dg1Bytes))
      val mrz = dg1File.mrzInfo
      putMap("dg1", buildRawFileResult(dg1Bytes))
      timings.putDouble("dg1", elapsedMillis(dg1StartedAt))
      Log.d(TAG, "DG1 read succeeded")

      val firstName = mrz.secondaryIdentifier.replace('<', ' ').trim().replace(Regex("\\s+"), " ")
      val lastName = mrz.primaryIdentifier.replace('<', ' ').trim().replace(Regex("\\s+"), " ")

      putBoolean("paceSucceeded", true)
      putString("firstName", firstName)
      putString("lastName", lastName)
      putString("fullName", "$firstName $lastName".trim())
      putString("documentNumber", mrz.documentNumber)
      putString("issuingState", mrz.issuingState)
      putString("nationality", mrz.nationality)
      putString("dateOfBirth", mrz.dateOfBirth)
      putString("dateOfExpiry", mrz.dateOfExpiry)

      val sodStartedAt = SystemClock.elapsedRealtime()
      val sodResult = readSOD(passportService)
      timings.putDouble("sod", elapsedMillis(sodStartedAt))

      val dg11StartedAt = SystemClock.elapsedRealtime()
      val dg11Result = readDG11(passportService)
      timings.putDouble("dg11", elapsedMillis(dg11StartedAt))

      val dg12StartedAt = SystemClock.elapsedRealtime()
      val dg12Result = readDG12(passportService)
      timings.putDouble("dg12", elapsedMillis(dg12StartedAt))

      val dg15StartedAt = SystemClock.elapsedRealtime()
      val dg15Result = readDG15(passportService)
      timings.putDouble("dg15", elapsedMillis(dg15StartedAt))

      val activeAuthStartedAt = SystemClock.elapsedRealtime()
      val activeAuthResult = performActiveAuthentication(passportService, dg15Result, aaChallenge)
      timings.putDouble("activeAuth", elapsedMillis(activeAuthStartedAt))

      val dg2StartedAt = SystemClock.elapsedRealtime()
      val dg2Result = readDG2(passportService)
      timings.putDouble("dg2", elapsedMillis(dg2StartedAt))

      putMap("sod", sodResult)
      putMap("dg11", dg11Result)
      putMap("dg12", dg12Result)
      putMap("dg15", dg15Result.toWritableMap())
      putMap("activeAuthentication", activeAuthResult)
      putMap("dg2", dg2Result)
      timings.putDouble("total", elapsedMillis(sessionStartedAt))
      putMap("timingsMs", timings)
    } catch (error: CardServiceException) {
      throw IllegalStateException(error.message ?: "Card service error during native PACE.", error)
    } finally {
      try {
        passportService.close()
      } catch (_: Exception) {
      }
      try {
        isoDep.close()
      } catch (_: Exception) {
      }
    }
  }

  private fun findPaceInfo(input: InputStream): PACEInfo? {
    val cardAccessFile = CardAccessFile(input)
    return cardAccessFile.securityInfos.firstNotNullOfOrNull { info ->
      (info as? PACEInfo)
    }
  }

  private fun disableReaderMode() {
    val activity = reactApplicationContext.currentActivity ?: return
    val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return

    UiThreadUtil.runOnUiThread {
      adapter.disableReaderMode(activity)
    }
  }

  private fun readDG11(passportService: PassportService) = Arguments.createMap().apply {
    try {
      val dg11Bytes = readLdsFile(passportService, PassportService.EF_DG11)
      val dg11 = DG11File(ByteArrayInputStream(dg11Bytes))
      val address = dg11.permanentAddress.joinToString(", ").trim()
      val placeOfBirth = dg11.placeOfBirth.joinToString(", ").trim()

      putBoolean("available", true)
      putMap("raw", buildRawFileResult(dg11Bytes))
      putString("nameOfHolder", dg11.nameOfHolder)
      if (dg11.personalNumber != null) {
        putString("personalNumber", dg11.personalNumber)
      }
      if (dg11.fullDateOfBirth != null) {
        putString("fullDateOfBirth", dg11.fullDateOfBirth)
      }
      if (placeOfBirth.isNotEmpty()) {
        putString("placeOfBirth", placeOfBirth)
      }
      if (address.isNotEmpty()) {
        putString("permanentAddress", address)
      }
      if (dg11.profession != null) {
        putString("profession", dg11.profession)
      }
      if (dg11.title != null) {
        putString("title", dg11.title)
      }
      Log.d(TAG, "DG11 read succeeded")
    } catch (error: Throwable) {
      putBoolean("available", false)
      putString("error", "${error::class.java.simpleName}: ${error.message ?: "DG11 read failed"}")
      Log.w(TAG, "DG11 read failed", error)
    }
  }

  private fun readDG12(passportService: PassportService) = Arguments.createMap().apply {
    try {
      val dg12Bytes = readLdsFile(passportService, PassportService.EF_DG12)
      val dg12 = DG12File(ByteArrayInputStream(dg12Bytes))
      putBoolean("available", true)
      putMap("raw", buildRawFileResult(dg12Bytes))
      if (dg12.issuingAuthority != null) {
        putString("issuingAuthority", dg12.issuingAuthority)
      }
      if (dg12.dateOfIssue != null) {
        putString("dateOfIssue", dg12.dateOfIssue)
      }
      if (dg12.dateAndTimeOfPersonalization != null) {
        putString("dateAndTimeOfPersonalization", dg12.dateAndTimeOfPersonalization)
      }
      if (dg12.personalizationSystemSerialNumber != null) {
        putString("personalizationSystemSerialNumber", dg12.personalizationSystemSerialNumber)
      }
      Log.d(TAG, "DG12 read succeeded")
    } catch (error: Throwable) {
      putBoolean("available", false)
      putString("error", "${error::class.java.simpleName}: ${error.message ?: "DG12 read failed"}")
      Log.w(TAG, "DG12 read failed", error)
    }
  }

  private fun readDG2(passportService: PassportService) = Arguments.createMap().apply {
    try {
      val dg2Bytes = readLdsFile(
        passportService,
        PassportService.EF_DG2,
        passportService.maxReadBinaryLength.coerceAtLeast(PassportService.DEFAULT_MAX_BLOCKSIZE),
      )
      val parsedImage = extractPortraitFromDG2(dg2Bytes)
      val imageBytes = parsedImage.bytes
      val mimeType = parsedImage.mimeType

      putBoolean("available", true)
      putMap("raw", buildRawFileResult(dg2Bytes))
      putInt("byteLength", imageBytes.size)
      putString("mimeType", mimeType)
      if (parsedImage.width != null) {
        putInt("width", parsedImage.width)
      }
      if (parsedImage.height != null) {
        putInt("height", parsedImage.height)
      }
      putString("base64", Base64.encodeToString(imageBytes, Base64.NO_WRAP))
      Log.d(TAG, "DG2 read succeeded, imageBytes=${imageBytes.size}, mime=$mimeType")
    } catch (error: Throwable) {
      putBoolean("available", false)
      putString("error", "${error::class.java.simpleName}: ${error.message ?: "DG2 read failed"}")
      Log.w(TAG, "DG2 read failed", error)
    }
  }

  private fun readDG15(passportService: PassportService): DG15ReadResult {
    return try {
      val dg15Bytes = readLdsFile(passportService, PassportService.EF_DG15)
      val dg15 = DG15File(ByteArrayInputStream(dg15Bytes))
      val publicKey = dg15.publicKey
      Log.d(TAG, "DG15 read succeeded")
      DG15ReadResult(
        available = true,
        rawBytes = dg15Bytes,
        publicKey = publicKey,
      )
    } catch (error: Throwable) {
      Log.w(TAG, "DG15 read failed", error)
      DG15ReadResult(
        available = false,
        error = "${error::class.java.simpleName}: ${error.message ?: "DG15 read failed"}",
      )
    }
  }

  private fun performActiveAuthentication(
    passportService: PassportService,
    dg15Result: DG15ReadResult,
    aaChallenge: ByteArray?,
  ) = Arguments.createMap().apply {
    putBoolean("supported", dg15Result.available && dg15Result.publicKey != null)
    putBoolean("performed", false)

    if (!dg15Result.available || dg15Result.publicKey == null) {
      if (dg15Result.error != null) {
        putString("error", dg15Result.error)
      }
      return@apply
    }

    if (aaChallenge == null) {
      putString("status", "challenge_not_provided")
      return@apply
    }

    try {
      val dg14Info = readActiveAuthenticationInfo(passportService)
      val signatureAlgorithmMnemonic = dg14Info?.signatureAlgorithmMnemonic
      val digestAlgorithm = inferDigestAlgorithm(signatureAlgorithmMnemonic, dg15Result.publicKey)
      val signatureAlgorithm = signatureAlgorithmMnemonic ?: dg15Result.publicKey.algorithm
      val aaResult = passportService.doAA(dg15Result.publicKey, digestAlgorithm, signatureAlgorithm, aaChallenge)

      putBoolean("performed", true)
      putBoolean("verifiedByChip", true)
      putString("status", "success")
      putString("challenge", Base64.encodeToString(aaResult.challenge, Base64.NO_WRAP))
      putString("response", Base64.encodeToString(aaResult.response, Base64.NO_WRAP))
      putString("publicKey", Base64.encodeToString(dg15Result.publicKey.encoded, Base64.NO_WRAP))
      putString("publicKeyAlgorithm", dg15Result.publicKey.algorithm)
      putString("digestAlgorithm", digestAlgorithm)
      putString("signatureAlgorithm", signatureAlgorithm)
      if (dg14Info?.signatureAlgorithmOid != null) {
        putString("signatureAlgorithmOid", dg14Info.signatureAlgorithmOid)
      }
      if (signatureAlgorithmMnemonic != null) {
        putString("signatureAlgorithmMnemonic", signatureAlgorithmMnemonic)
      }
      Log.d(TAG, "Active authentication succeeded")
    } catch (error: Throwable) {
      putString(
        "error",
        "${error::class.java.simpleName}: ${error.message ?: "Active authentication failed"}",
      )
      Log.w(TAG, "Active authentication failed", error)
    }
  }

  private fun readSOD(passportService: PassportService) = Arguments.createMap().apply {
    try {
      val sodBytes = readLdsFile(passportService, PassportService.EF_SOD)
      val sod = SODFile(ByteArrayInputStream(sodBytes))
      val dataGroupHashes = Arguments.createMap()
      sod.dataGroupHashes.forEach { (dgNumber, hash) ->
        dataGroupHashes.putString(dgNumber.toString(), Base64.encodeToString(hash, Base64.NO_WRAP))
      }

      putBoolean("available", true)
      putMap("raw", buildRawFileResult(sodBytes))
      putString("digestAlgorithm", sod.digestAlgorithm)
      putString("signerDigestAlgorithm", sod.signerInfoDigestAlgorithm)
      putString("digestEncryptionAlgorithm", sod.digestEncryptionAlgorithm)
      putMap("dataGroupHashes", dataGroupHashes)

      val certificates = sod.docSigningCertificates
      if (certificates.isNotEmpty()) {
        putString(
          "documentSigningCertificate",
          Base64.encodeToString(certificates.first().encoded, Base64.NO_WRAP),
        )
      }
      Log.d(TAG, "SOD read succeeded")
    } catch (error: Throwable) {
      putBoolean("available", false)
      putString("error", "${error::class.java.simpleName}: ${error.message ?: "SOD read failed"}")
      Log.w(TAG, "SOD read failed", error)
    }
  }

  private fun extractPortraitFromDG2(dg2Bytes: ByteArray): ExtractedPortrait {
    try {
      val dg2 = DG2File(ByteArrayInputStream(dg2Bytes))
      val faceInfo = dg2.faceInfos.firstOrNull()
        ?: throw IllegalStateException("DG2 contained no face records.")
      val faceImage = faceInfo.faceImageInfos.firstOrNull()
        ?: throw IllegalStateException("DG2 contained no face image.")
      val imageBytes = readFully(faceImage.imageInputStream)

      return ExtractedPortrait(
        bytes = imageBytes,
        mimeType = faceImage.mimeType,
        width = faceImage.width,
        height = faceImage.height,
      )
    } catch (error: Throwable) {
      Log.w(TAG, "JMRTD DG2 image parse failed, trying raw marker scan", error)
    }

    val jpegOffset = indexOfSequence(dg2Bytes, byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte()))
    if (jpegOffset >= 0) {
      return ExtractedPortrait(
        bytes = dg2Bytes.copyOfRange(jpegOffset, dg2Bytes.size),
        mimeType = "image/jpeg",
      )
    }

    val jp2Offset = indexOfSequence(
      dg2Bytes,
      byteArrayOf(0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20, 0x0D, 0x0A, 0x87.toByte(), 0x0A),
    )
    if (jp2Offset >= 0) {
      return ExtractedPortrait(
        bytes = dg2Bytes.copyOfRange(jp2Offset, dg2Bytes.size),
        mimeType = "image/jp2",
      )
    }

    val codestreamOffset = indexOfSequence(
      dg2Bytes,
      byteArrayOf(0xFF.toByte(), 0x4F.toByte(), 0xFF.toByte(), 0x51.toByte()),
    )
    if (codestreamOffset >= 0) {
      return ExtractedPortrait(
        bytes = dg2Bytes.copyOfRange(codestreamOffset, dg2Bytes.size),
        mimeType = "image/jp2",
      )
    }

    throw IllegalStateException("No embedded portrait image marker was found in DG2.")
  }

  private fun indexOfSequence(haystack: ByteArray, needle: ByteArray): Int {
    if (needle.isEmpty() || haystack.size < needle.size) {
      return -1
    }

    for (start in 0..haystack.size - needle.size) {
      var matches = true
      for (offset in needle.indices) {
        if (haystack[start + offset] != needle[offset]) {
          matches = false
          break
        }
      }
      if (matches) {
        return start
      }
    }

    return -1
  }

  private fun readLdsFile(
    passportService: PassportService,
    fileId: Short,
    blockSize: Int = PassportService.DEFAULT_MAX_BLOCKSIZE,
  ): ByteArray {
    return readFully(passportService.getInputStream(fileId, blockSize))
  }

  private fun readActiveAuthenticationInfo(passportService: PassportService): ActiveAuthenticationMetadata? {
    return try {
      val dg14Bytes = readLdsFile(passportService, PassportService.EF_DG14)
      val dg14 = DG14File(ByteArrayInputStream(dg14Bytes))
      val activeAuthInfo = dg14.activeAuthenticationInfos.firstOrNull() ?: return null
      val signatureAlgorithmOid = activeAuthInfo.signatureAlgorithmOID
      val signatureAlgorithmMnemonic =
        if (signatureAlgorithmOid != null) {
          try {
            ActiveAuthenticationInfo.lookupMnemonicByOID(signatureAlgorithmOid)
          } catch (_: Exception) {
            null
          }
        } else {
          null
        }

      ActiveAuthenticationMetadata(signatureAlgorithmOid, signatureAlgorithmMnemonic)
    } catch (_: Throwable) {
      null
    }
  }

  private fun inferDigestAlgorithm(signatureAlgorithmMnemonic: String?, publicKey: PublicKey): String {
    if (signatureAlgorithmMnemonic != null) {
      return when {
        signatureAlgorithmMnemonic.startsWith("SHA1") -> "SHA-1"
        signatureAlgorithmMnemonic.startsWith("SHA224") -> "SHA-224"
        signatureAlgorithmMnemonic.startsWith("SHA256") -> "SHA-256"
        signatureAlgorithmMnemonic.startsWith("SHA384") -> "SHA-384"
        signatureAlgorithmMnemonic.startsWith("SHA512") -> "SHA-512"
        signatureAlgorithmMnemonic.startsWith("RIPEMD160") -> "RIPEMD160"
        else -> "SHA-256"
      }
    }

    return when (publicKey.algorithm.uppercase()) {
      "EC", "ECDSA" -> "SHA-256"
      else -> "SHA-256"
    }
  }

  private fun buildRawFileResult(bytes: ByteArray) = Arguments.createMap().apply {
    putInt("byteLength", bytes.size)
    putString("base64", Base64.encodeToString(bytes, Base64.NO_WRAP))
    putString("sha256", digestBase64("SHA-256", bytes))
  }

  private fun digestBase64(algorithm: String, bytes: ByteArray): String {
    val digest = MessageDigest.getInstance(algorithm).digest(bytes)
    return Base64.encodeToString(digest, Base64.NO_WRAP)
  }

  private fun elapsedMillis(startedAt: Long): Double {
    return (SystemClock.elapsedRealtime() - startedAt).toDouble()
  }

  private fun readFully(input: InputStream): ByteArray {
    input.use { stream ->
      val output = ByteArrayOutputStream()
      val buffer = ByteArray(4096)

      while (true) {
        val count = stream.read(buffer)
        if (count <= 0) {
          break
        }
        output.write(buffer, 0, count)
      }

      return output.toByteArray()
    }
  }
}

private data class ExtractedPortrait(
  val bytes: ByteArray,
  val mimeType: String,
  val width: Int? = null,
  val height: Int? = null,
)

private data class DG15ReadResult(
  val available: Boolean,
  val rawBytes: ByteArray? = null,
  val publicKey: PublicKey? = null,
  val error: String? = null,
) {
  fun toWritableMap() = Arguments.createMap().apply {
    putBoolean("available", available)
    if (rawBytes != null) {
      putMap("raw", Arguments.createMap().apply {
        putInt("byteLength", rawBytes.size)
        putString("base64", Base64.encodeToString(rawBytes, Base64.NO_WRAP))
        putString("sha256", Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(rawBytes), Base64.NO_WRAP))
      })
    }
    if (publicKey != null) {
      putString("publicKey", Base64.encodeToString(publicKey.encoded, Base64.NO_WRAP))
      putString("publicKeyAlgorithm", publicKey.algorithm)
      if (publicKey.format != null) {
        putString("publicKeyFormat", publicKey.format)
      }
    }
    if (error != null) {
      putString("error", error)
    }
  }
}

private data class ActiveAuthenticationMetadata(
  val signatureAlgorithmOid: String?,
  val signatureAlgorithmMnemonic: String?,
)

private class AndroidIsoDepCardService(
  private val isoDep: IsoDep,
) : CardService() {

  override fun open() {
    if (!isoDep.isConnected) {
      isoDep.connect()
    }
    state = SESSION_STARTED_STATE
  }

  override fun isOpen(): Boolean = isoDep.isConnected

  override fun transmit(command: CommandAPDU): ResponseAPDU {
    try {
      val response = isoDep.transceive(command.bytes)
      return ResponseAPDU(response)
    } catch (error: Exception) {
      throw CardServiceException(error.message ?: "IsoDep transceive failed.", error)
    }
  }

  override fun getATR(): ByteArray = byteArrayOf()

  override fun close() {
    try {
      if (isoDep.isConnected) {
        isoDep.close()
      }
    } catch (_: Exception) {
    } finally {
      state = SESSION_STOPPED_STATE
    }
  }

  override fun isConnectionLost(exception: Exception): Boolean = !isoDep.isConnected
}
