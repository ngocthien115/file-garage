package com.example.filegarage.data.model

import kotlinx.serialization.Serializable

@Serializable
data class FileItem(
    val fileName: String,
    val url: String
)
