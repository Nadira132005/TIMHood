import org.bouncycastle.crypto.digests.RIPEMD160Digest;
import org.bouncycastle.crypto.digests.SHA1Digest;
import org.bouncycastle.crypto.digests.SHA224Digest;
import org.bouncycastle.crypto.digests.SHA256Digest;
import org.bouncycastle.crypto.digests.SHA384Digest;
import org.bouncycastle.crypto.digests.SHA512Digest;
import org.bouncycastle.crypto.engines.RSAEngine;
import org.bouncycastle.crypto.params.RSAKeyParameters;
import org.bouncycastle.crypto.signers.ISO9796d2Signer;
import org.jmrtd.lds.SODFile;
import org.jmrtd.lds.icao.DG1File;
import org.jmrtd.lds.icao.DG15File;
import org.jmrtd.lds.icao.DG2File;
import org.jmrtd.lds.icao.MRZInfo;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.interfaces.ECPublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.List;
import java.util.Map;

public class NfcEvidenceVerifier {
  public static void main(String[] args) {
    try {
      Arguments parsed = Arguments.parse(args);
      VerificationResult result = verify(parsed);
      System.out.println(result.toJson());
    } catch (Exception error) {
      System.out.println("{\"error\":\"" + escape(error.getMessage()) + "\"}");
    }
  }

  private static VerificationResult verify(Arguments args) throws Exception {
    byte[] dg1Bytes = Files.readAllBytes(Path.of(args.dg1Path));
    byte[] dg2Bytes = Files.readAllBytes(Path.of(args.dg2Path));
    byte[] dg15Bytes = Files.readAllBytes(Path.of(args.dg15Path));
    byte[] sodBytes = Files.readAllBytes(Path.of(args.sodPath));
    byte[] challenge = Base64.getDecoder().decode(args.challengeBase64);
    byte[] aaResponse = Base64.getDecoder().decode(args.aaResponseBase64);

    DG1File dg1File = new DG1File(new ByteArrayInputStream(dg1Bytes));
    MRZInfo mrz = dg1File.getMRZInfo();
    DG2File dg2File = new DG2File(new ByteArrayInputStream(dg2Bytes));
    DG15File dg15File = new DG15File(new ByteArrayInputStream(dg15Bytes));
    SODFile sodFile = new SODFile(new ByteArrayInputStream(sodBytes));

    String digestAlgorithm = sodFile.getDigestAlgorithm();
    Map<Integer, byte[]> hashes = sodFile.getDataGroupHashes();
    byte[] dg1Digest = digest(digestAlgorithm, dg1Bytes);
    byte[] dg2Digest = digest(digestAlgorithm, dg2Bytes);
    boolean dg1Matches = MessageDigest.isEqual(dg1Digest, hashes.get(1));
    boolean dg2Matches = MessageDigest.isEqual(dg2Digest, hashes.get(2));

    X509Certificate dsc = sodFile.getDocSigningCertificate();
    boolean sodSignatureVerified = verifySodSignature(sodFile, dsc);
    boolean cscaTrusted = args.cscaPath != null && !args.cscaPath.isBlank() && verifyAgainstCsca(dsc, args.cscaPath);

    PublicKey publicKey = dg15File.getPublicKey();
    boolean aaVerified = verifyActiveAuthentication(
      publicKey,
      challenge,
      aaResponse,
      args.aaDigestAlgorithm,
      args.aaSignatureAlgorithm,
      args.aaSignatureAlgorithmOid
    );

    byte[] photoBytes = extractPortrait(dg2File);

    return new VerificationResult(
      mrz.getDocumentNumber(),
      cleanName(mrz.getSecondaryIdentifier()),
      cleanName(mrz.getPrimaryIdentifier()),
      cleanName(mrz.getSecondaryIdentifier()) + " " + cleanName(mrz.getPrimaryIdentifier()),
      mrz.getNationality(),
      mrz.getIssuingState(),
      mrz.getDateOfBirth(),
      mrz.getDateOfExpiry(),
      photoBytes != null ? Base64.getEncoder().encodeToString(photoBytes) : null,
      dg1Matches && dg2Matches,
      sodSignatureVerified,
      cscaTrusted,
      digestAlgorithm,
      dsc != null ? dsc.getSubjectX500Principal().getName() : null,
      dsc != null ? dsc.getIssuerX500Principal().getName() : null,
      true,
      aaVerified,
      publicKey != null ? publicKey.getAlgorithm() : null,
      args.aaDigestAlgorithm,
      args.aaSignatureAlgorithm
    );
  }

  private static byte[] digest(String algorithm, byte[] bytes) throws Exception {
    return MessageDigest.getInstance(algorithm).digest(bytes);
  }

  private static boolean verifySodSignature(SODFile sodFile, X509Certificate dsc) throws Exception {
    if (dsc == null) {
      return false;
    }

    Signature signature = Signature.getInstance(sodFile.getDigestEncryptionAlgorithm());
    signature.initVerify(dsc.getPublicKey());
    signature.update(sodFile.getEContent());
    return signature.verify(sodFile.getEncryptedDigest());
  }

  private static boolean verifyAgainstCsca(X509Certificate dsc, String cscaPath) {
    if (dsc == null) {
      return false;
    }

    try (InputStream input = new FileInputStream(cscaPath)) {
      CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
      Collection<? extends java.security.cert.Certificate> certificates =
        certificateFactory.generateCertificates(input);

      for (java.security.cert.Certificate certificate : certificates) {
        X509Certificate csca = (X509Certificate) certificate;
        try {
          dsc.verify(csca.getPublicKey());
          return true;
        } catch (Exception ignored) {
        }
      }
    } catch (Exception ignored) {
    }

    return false;
  }

  private static boolean verifyActiveAuthentication(
    PublicKey publicKey,
    byte[] challenge,
    byte[] response,
    String digestAlgorithm,
    String signatureAlgorithm,
    String signatureAlgorithmOid
  ) throws Exception {
    if (publicKey instanceof ECPublicKey) {
      String algorithm = signatureAlgorithm != null && !signatureAlgorithm.isBlank()
        ? signatureAlgorithm
        : "SHA256withECDSA";
      Signature verifier = Signature.getInstance(algorithm);
      verifier.initVerify(publicKey);
      verifier.update(challenge);
      byte[] signatureBytes = isPlainEcdsa(signatureAlgorithmOid)
        ? plainEcdsaToDer(response)
        : response;
      return verifier.verify(signatureBytes);
    }

    if (publicKey instanceof RSAPublicKey rsaPublicKey) {
      ISO9796d2Signer signer = new ISO9796d2Signer(
        new RSAEngine(),
        createDigest(digestAlgorithm),
        true
      );
      signer.init(
        false,
        new RSAKeyParameters(false, rsaPublicKey.getModulus(), rsaPublicKey.getPublicExponent())
      );
      signer.update(challenge, 0, challenge.length);
      return signer.verifySignature(response);
    }

    KeyFactory keyFactory = KeyFactory.getInstance(publicKey.getAlgorithm());
    PublicKey rebuilt = keyFactory.generatePublic(new X509EncodedKeySpec(publicKey.getEncoded()));
    Signature verifier = Signature.getInstance(signatureAlgorithm);
    verifier.initVerify(rebuilt);
    verifier.update(challenge);
    return verifier.verify(response);
  }

  private static org.bouncycastle.crypto.Digest createDigest(String digestAlgorithm) {
    if ("SHA-1".equalsIgnoreCase(digestAlgorithm)) {
      return new SHA1Digest();
    }
    if ("SHA-224".equalsIgnoreCase(digestAlgorithm)) {
      return new SHA224Digest();
    }
    if ("SHA-256".equalsIgnoreCase(digestAlgorithm)) {
      return new SHA256Digest();
    }
    if ("SHA-384".equalsIgnoreCase(digestAlgorithm)) {
      return new SHA384Digest();
    }
    if ("SHA-512".equalsIgnoreCase(digestAlgorithm)) {
      return new SHA512Digest();
    }
    if ("RIPEMD160".equalsIgnoreCase(digestAlgorithm)) {
      return new RIPEMD160Digest();
    }

    return new SHA256Digest();
  }

  private static boolean isPlainEcdsa(String signatureAlgorithmOid) {
    return signatureAlgorithmOid != null && signatureAlgorithmOid.startsWith("0.4.0.127.0.7.1.1.4.1.");
  }

  private static byte[] plainEcdsaToDer(byte[] plainSignature) {
    int componentLength = plainSignature.length / 2;
    BigInteger r = new BigInteger(1, slice(plainSignature, 0, componentLength));
    BigInteger s = new BigInteger(1, slice(plainSignature, componentLength, componentLength));
    byte[] rBytes = trimLeadingZero(r.toByteArray());
    byte[] sBytes = trimLeadingZero(s.toByteArray());

    List<Byte> output = new ArrayList<>();
    output.add((byte) 0x30);
    int totalLength = 2 + rBytes.length + 2 + sBytes.length;
    output.add((byte) totalLength);
    output.add((byte) 0x02);
    output.add((byte) rBytes.length);
    append(output, rBytes);
    output.add((byte) 0x02);
    output.add((byte) sBytes.length);
    append(output, sBytes);

    byte[] der = new byte[output.size()];
    for (int index = 0; index < output.size(); index++) {
      der[index] = output.get(index);
    }
    return der;
  }

  private static byte[] slice(byte[] source, int offset, int length) {
    byte[] result = new byte[length];
    System.arraycopy(source, offset, result, 0, length);
    return result;
  }

  private static byte[] trimLeadingZero(byte[] value) {
    if (value.length == 0 || (value[0] & 0x80) == 0) {
      return value;
    }

    byte[] result = new byte[value.length + 1];
    System.arraycopy(value, 0, result, 1, value.length);
    return result;
  }

  private static void append(List<Byte> output, byte[] value) {
    for (byte item : value) {
      output.add(item);
    }
  }

  private static byte[] extractPortrait(DG2File dg2File) throws Exception {
    if (dg2File.getFaceInfos().isEmpty()) {
      return null;
    }
    if (dg2File.getFaceInfos().get(0).getFaceImageInfos().isEmpty()) {
      return null;
    }

    try (InputStream input = dg2File.getFaceInfos().get(0).getFaceImageInfos().get(0).getImageInputStream()) {
      return input.readAllBytes();
    }
  }

  private static String cleanName(String input) {
    return input == null ? "" : input.replace('<', ' ').trim().replaceAll("\\s+", " ");
  }

  private static String escape(String value) {
    if (value == null) {
      return "";
    }

    return value
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\n", "\\n")
      .replace("\r", "\\r");
  }

  private static final class Arguments {
    private final String dg1Path;
    private final String dg2Path;
    private final String dg15Path;
    private final String sodPath;
    private final String challengeBase64;
    private final String aaResponseBase64;
    private final String aaDigestAlgorithm;
    private final String aaSignatureAlgorithm;
    private final String aaSignatureAlgorithmOid;
    private final String cscaPath;

    private Arguments(
      String dg1Path,
      String dg2Path,
      String dg15Path,
      String sodPath,
      String challengeBase64,
      String aaResponseBase64,
      String aaDigestAlgorithm,
      String aaSignatureAlgorithm,
      String aaSignatureAlgorithmOid,
      String cscaPath
    ) {
      this.dg1Path = dg1Path;
      this.dg2Path = dg2Path;
      this.dg15Path = dg15Path;
      this.sodPath = sodPath;
      this.challengeBase64 = challengeBase64;
      this.aaResponseBase64 = aaResponseBase64;
      this.aaDigestAlgorithm = aaDigestAlgorithm;
      this.aaSignatureAlgorithm = aaSignatureAlgorithm;
      this.aaSignatureAlgorithmOid = aaSignatureAlgorithmOid;
      this.cscaPath = cscaPath;
    }

    private static Arguments parse(String[] args) {
      String dg1 = "";
      String dg2 = "";
      String dg15 = "";
      String sod = "";
      String challenge = "";
      String aaResponse = "";
      String aaDigest = "";
      String aaSignature = "";
      String aaSignatureOid = "";
      String csca = "";

      for (int index = 0; index < args.length; index += 2) {
        String key = args[index];
        String value = index + 1 < args.length ? args[index + 1] : "";

        switch (key) {
          case "--dg1" -> dg1 = value;
          case "--dg2" -> dg2 = value;
          case "--dg15" -> dg15 = value;
          case "--sod" -> sod = value;
          case "--challenge" -> challenge = value;
          case "--aa-response" -> aaResponse = value;
          case "--aa-digest" -> aaDigest = value;
          case "--aa-signature" -> aaSignature = value;
          case "--aa-signature-oid" -> aaSignatureOid = value;
          case "--csca" -> csca = value;
          default -> {
          }
        }
      }

      return new Arguments(dg1, dg2, dg15, sod, challenge, aaResponse, aaDigest, aaSignature, aaSignatureOid, csca);
    }
  }

  private static final class VerificationResult {
    private final String documentNumber;
    private final String firstName;
    private final String lastName;
    private final String fullName;
    private final String nationality;
    private final String issuingState;
    private final String dateOfBirth;
    private final String dateOfExpiry;
    private final String photoBase64;
    private final boolean hashVerified;
    private final boolean sodSignatureVerified;
    private final boolean cscaTrusted;
    private final String digestAlgorithm;
    private final String dscSubject;
    private final String dscIssuer;
    private final boolean challengeMatched;
    private final boolean aaVerified;
    private final String publicKeyAlgorithm;
    private final String aaDigestAlgorithm;
    private final String aaSignatureAlgorithm;

    private VerificationResult(
      String documentNumber,
      String firstName,
      String lastName,
      String fullName,
      String nationality,
      String issuingState,
      String dateOfBirth,
      String dateOfExpiry,
      String photoBase64,
      boolean hashVerified,
      boolean sodSignatureVerified,
      boolean cscaTrusted,
      String digestAlgorithm,
      String dscSubject,
      String dscIssuer,
      boolean challengeMatched,
      boolean aaVerified,
      String publicKeyAlgorithm,
      String aaDigestAlgorithm,
      String aaSignatureAlgorithm
    ) {
      this.documentNumber = documentNumber;
      this.firstName = firstName;
      this.lastName = lastName;
      this.fullName = fullName.trim();
      this.nationality = nationality;
      this.issuingState = issuingState;
      this.dateOfBirth = dateOfBirth;
      this.dateOfExpiry = dateOfExpiry;
      this.photoBase64 = photoBase64;
      this.hashVerified = hashVerified;
      this.sodSignatureVerified = sodSignatureVerified;
      this.cscaTrusted = cscaTrusted;
      this.digestAlgorithm = digestAlgorithm;
      this.dscSubject = dscSubject;
      this.dscIssuer = dscIssuer;
      this.challengeMatched = challengeMatched;
      this.aaVerified = aaVerified;
      this.publicKeyAlgorithm = publicKeyAlgorithm;
      this.aaDigestAlgorithm = aaDigestAlgorithm;
      this.aaSignatureAlgorithm = aaSignatureAlgorithm;
    }

    private String toJson() {
      return "{"
        + "\"documentNumber\":\"" + escape(documentNumber) + "\","
        + "\"firstName\":\"" + escape(firstName) + "\","
        + "\"lastName\":\"" + escape(lastName) + "\","
        + "\"fullName\":\"" + escape(fullName) + "\","
        + "\"nationality\":\"" + escape(nationality) + "\","
        + "\"issuingState\":\"" + escape(issuingState) + "\","
        + "\"dateOfBirth\":\"" + escape(dateOfBirth) + "\","
        + "\"dateOfExpiry\":\"" + escape(dateOfExpiry) + "\","
        + "\"photoBase64\":\"" + escape(photoBase64) + "\","
        + "\"passiveAuth\":{"
        + "\"hashVerified\":" + hashVerified + ","
        + "\"sodSignatureVerified\":" + sodSignatureVerified + ","
        + "\"cscaTrusted\":" + cscaTrusted + ","
        + "\"digestAlgorithm\":\"" + escape(digestAlgorithm) + "\","
        + "\"documentSigningCertificateSubject\":\"" + escape(dscSubject) + "\","
        + "\"documentSigningCertificateIssuer\":\"" + escape(dscIssuer) + "\""
        + "},"
        + "\"activeAuth\":{"
        + "\"challengeMatched\":" + challengeMatched + ","
        + "\"signatureVerified\":" + aaVerified + ","
        + "\"publicKeyAlgorithm\":\"" + escape(publicKeyAlgorithm) + "\","
        + "\"digestAlgorithm\":\"" + escape(aaDigestAlgorithm) + "\","
        + "\"signatureAlgorithm\":\"" + escape(aaSignatureAlgorithm) + "\""
        + "}"
        + "}";
    }
  }
}
