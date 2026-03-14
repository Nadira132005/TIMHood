package com.timhoodnfc

import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Bundle
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
import java.io.InputStream
import java.math.BigInteger
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
}

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
