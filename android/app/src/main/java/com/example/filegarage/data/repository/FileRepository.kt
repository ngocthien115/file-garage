package com.example.filegarage.data.repository

import com.example.filegarage.data.api.RetrofitClient
import com.example.filegarage.data.model.FileItem
import okhttp3.MultipartBody

class FileRepository {

    private val api = RetrofitClient.instance

    suspend fun getListFiles(): List<FileItem> {
        return api.getListFiles()
    }

    suspend fun uploadFile(filePart: MultipartBody.Part): FileItem {
        return api.uploadFile(filePart)
    }
}
