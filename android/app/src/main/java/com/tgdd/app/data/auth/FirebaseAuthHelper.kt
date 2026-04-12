package com.tgdd.app.data.auth

import android.app.Activity
import android.content.Intent
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.tgdd.app.R
import kotlinx.coroutines.tasks.await

@Suppress("DEPRECATION")
class FirebaseAuthHelper(private val activity: Activity) {

    private lateinit var googleSignInClient: GoogleSignInClient
    private val firebaseAuth = FirebaseAuth.getInstance()

    init {
        val webClientId = activity.getString(R.string.default_web_client_id)
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .build()

        googleSignInClient = GoogleSignIn.getClient(activity, gso)
    }

    fun getSignInIntent(): Intent {
        return googleSignInClient.signInIntent
    }

    suspend fun handleSignInResult(data: Intent?): Result<String> {
        val task = GoogleSignIn.getSignedInAccountFromIntent(data)
        return try {
            val account = task.getResult(ApiException::class.java)
            val googleIdToken = account.idToken
            if (googleIdToken != null) {
                val credential = GoogleAuthProvider.getCredential(googleIdToken, null)
                val authResult = firebaseAuth.signInWithCredential(credential).await()
                val firebaseIdToken = authResult.user?.getIdToken(false)?.await()?.token
                if (firebaseIdToken != null) {
                    Result.success(firebaseIdToken)
                } else {
                    Result.failure(Exception("No Firebase ID token received"))
                }
            } else {
                Result.failure(Exception("No Google ID token received"))
            }
        } catch (e: ApiException) {
            Result.failure(Exception("Google sign in failed: ${e.message}"))
        } catch (e: Exception) {
            Result.failure(Exception("Firebase sign in failed: ${e.message}"))
        }
    }

    suspend fun signInWithEmailPassword(email: String, password: String): Result<String> {
        return try {
            val result = firebaseAuth.signInWithEmailAndPassword(email, password).await()
            val idToken = result.user?.getIdToken(false)?.await()?.token
            if (idToken != null) {
                Result.success(idToken)
            } else {
                Result.failure(Exception("No ID token received"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signUpWithEmailPassword(email: String, password: String, displayName: String): Result<String> {
        return try {
            val result = firebaseAuth.createUserWithEmailAndPassword(email, password).await()
            val user = result.user
            user?.let {
                val profileUpdates = com.google.firebase.auth.UserProfileChangeRequest.Builder()
                    .setDisplayName(displayName)
                    .build()
                it.updateProfile(profileUpdates).await()
            }
            user?.sendEmailVerification()
            user?.getIdToken(false)?.await()?.token?.let { Result.success(it) }
                ?: Result.failure(Exception("No ID token received"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    suspend fun sendPasswordResetEmail(email: String): Result<Unit> {
        return try {
            firebaseAuth.sendPasswordResetEmail(email).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun signOut() {
        googleSignInClient.signOut()
        firebaseAuth.signOut()
    }

    companion object {
        const val RC_SIGN_IN = 9001
    }
}
