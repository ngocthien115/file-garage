package com.example.filegarage.splash

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.example.filegarage.MainActivity
import com.example.filegarage.R
import com.example.filegarage.data.repository.FileRepository
import com.example.filegarage.ui.theme.FileGarageTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SplashActivity : ComponentActivity() {

    private val repository = FileRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)

        var keepSplashOnScreen = true
        splashScreen.setKeepOnScreenCondition { keepSplashOnScreen }

        setContent {
            FileGarageTheme {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Image(
                            painter = painterResource(R.drawable.ic_launcher_foreground),
                            contentDescription = "App Logo",
                            modifier = Modifier.size(120.dp)
                        )
                        Text(
                            text = "File Garage",
                            style = MaterialTheme.typography.headlineMedium,
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        )
                        CircularProgressIndicator(
                            modifier = Modifier
                                .align(Alignment.CenterHorizontally)
                                .size(40.dp)
                        )
                    }
                }
            }
        }

        // Fetch data in background
        CoroutineScope(Dispatchers.IO).launch {
            try {
                repository.getListFiles()
                // Data fetched successfully
            } catch (e: Exception) {
                // Ignore errors during splash, will retry on main screen
            } finally {
                delay(1500) // Minimum splash duration
                keepSplashOnScreen = false
            }
        }

        // Navigate to MainActivity when splash is done
        CoroutineScope(Dispatchers.Main).launch {
            delay(2000)
            startActivity(Intent(this@SplashActivity, MainActivity::class.java))
            finish()
        }
    }
}
