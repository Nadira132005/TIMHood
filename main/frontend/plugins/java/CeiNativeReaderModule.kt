package com.timhood.app

import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Bundle
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
import org.jmrtd.lds.CardAccessFile
import org.jmrtd.lds.PACEInfo
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File
import org.jmrtd.lds.icao.DG11File
import org.jmrtd.lds.icao.DG12File
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.math.BigInteger
import java.util.concurrent.Executors

class CeiNativeReaderModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), NfcAdapter.ReaderCallback {
  companion object {
    private const val TAG = "CeiNativeReader"
    private const val DG2_BLOCK_SIZE = 0x40
  }

  private val executor = Executors.newSingleThreadExecutor()
  @Volatile private var pendingPromise: Promise? = null
  @Volatile private var pendingCan: String? = null

  override fun getName(): String = "CeiNativeReader"

  @ReactMethod
  fun readNameWithPace(can: String, promise: Promise) {
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
    pendingPromise = null
    pendingCan = null

    if (can == null) {
      promise.reject("missing_can", "Missing CAN for native reader session.")
      return
    }

    executor.execute {
      try {
        val isoDep = IsoDep.get(tag)
          ?: throw IllegalStateException("The tapped document does not expose IsoDep.")
        isoDep.timeout = 15_000

        val result = readNameOverPace(isoDep, can)
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

  private fun readNameOverPace(isoDep: IsoDep, can: String) = Arguments.createMap().apply {
    val cardService = AndroidIsoDepCardService(isoDep)
    val passportService =
      PassportService(
        cardService,
        PassportService.NORMAL_MAX_TRANCEIVE_LENGTH,
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
      Log.d(TAG, "doPACE() succeeded")

      passportService.sendSelectApplet(true)
      Log.d(TAG, "sendSelectApplet(true) succeeded")

      val dg1Input = passportService.getInputStream(PassportService.EF_DG1)
      val dg1File = DG1File(dg1Input)
      val mrz = dg1File.mrzInfo
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

      val dg11Result = readDG11(passportService)
      val dg12Result = readDG12(passportService)
      val dg2Result = readDG2(passportService)

      putMap("dg11", dg11Result)
      putMap("dg12", dg12Result)
      putMap("dg2", dg2Result)
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
      val dg11 = DG11File(passportService.getInputStream(PassportService.EF_DG11))
      val address = dg11.permanentAddress.joinToString(", ").trim()
      val placeOfBirth = dg11.placeOfBirth.joinToString(", ").trim()

      putBoolean("available", true)
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
      val dg12 = DG12File(passportService.getInputStream(PassportService.EF_DG12))
      putBoolean("available", true)
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
      val dg2Bytes = readFully(passportService.getInputStream(PassportService.EF_DG2, DG2_BLOCK_SIZE))
      val parsedImage = extractPortraitFromDG2(dg2Bytes)
      val imageBytes = parsedImage.bytes
      val mimeType = parsedImage.mimeType

      putBoolean("available", true)
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

  private fun readFully(input: InputStream): ByteArray {
    input.use { stream ->
      val buffer = ByteArray(4096)
      val output = mutableListOf<Byte>()

      while (true) {
        val count = stream.read(buffer)
        if (count <= 0) {
          break
        }
        for (index in 0 until count) {
          output.add(buffer[index])
        }
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
