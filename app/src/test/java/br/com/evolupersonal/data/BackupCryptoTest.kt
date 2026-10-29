package br.com.evolupersonal.data

import org.junit.Assert.*
import org.junit.Test

class BackupCryptoTest {
    @Test fun portableRoundTripAndRandomizedEncryption() {
        val data = "alunos e séries çã".toByteArray()
        val a = BackupCrypto.encrypt(data, "senha-segura".toCharArray())
        val b = BackupCrypto.encrypt(data, "senha-segura".toCharArray())
        assertFalse(a.contentEquals(b))
        assertArrayEquals(data, BackupCrypto.decrypt(a, "senha-segura".toCharArray()))
    }
    @Test fun wrongPasswordAndTamperingFailAuthentication() {
        val bytes = BackupCrypto.encrypt("dados".toByteArray(), "senha-segura".toCharArray())
        assertThrows(Exception::class.java) { BackupCrypto.decrypt(bytes, "outra-senha".toCharArray()) }
        bytes[bytes.lastIndex] = (bytes.last().toInt() xor 1).toByte()
        assertThrows(Exception::class.java) { BackupCrypto.decrypt(bytes, "senha-segura".toCharArray()) }
    }
    @Test fun rejectsShortPasswordAndTruncatedFile() {
        assertThrows(IllegalArgumentException::class.java) { BackupCrypto.encrypt(byteArrayOf(1), "curta".toCharArray()) }
        assertThrows(IllegalArgumentException::class.java) { BackupCrypto.decrypt(byteArrayOf(1, 2), "senha-segura".toCharArray()) }
    }
}
