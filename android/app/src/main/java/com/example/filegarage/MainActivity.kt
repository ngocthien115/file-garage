package com.example.filegarage

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.filegarage.ui.screens.FileListScreen
import com.example.filegarage.ui.theme.FileGarageTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FileGarageTheme {
                FileListScreen()
            }
        }
    }
}