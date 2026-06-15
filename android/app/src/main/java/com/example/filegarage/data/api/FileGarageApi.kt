package com.example.filegarage.data.api

import com.example.filegarage.data.model.FileItem
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Part
import okhttp3.MultipartBody

interface FileGarageApi {

    @GET("files")
    suspend fun getListFiles(): List<FileItem>

    @Multipart
    @POST("upload")
    suspend fun uploadFile(
        @Part file: MultipartBody.Part
    ): FileItem
}
