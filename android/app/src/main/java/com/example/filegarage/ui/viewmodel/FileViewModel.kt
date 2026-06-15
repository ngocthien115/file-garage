package com.example.filegarage.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.filegarage.data.model.FileItem
import com.example.filegarage.data.repository.FileRepository
import kotlinx.coroutines.launch

class FileViewModel : ViewModel() {

    private val repository = FileRepository()

    var uiState by mutableStateOf<FileUiState>(FileUiState.Loading)
        private set

    init {
        loadFiles()
    }

    fun loadFiles() {
        viewModelScope.launch {
            uiState = FileUiState.Loading
            try {
                val files = repository.getListFiles()
                uiState = FileUiState.Success(files)
            } catch (e: Exception) {
                uiState = FileUiState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun uploadFile(fileItem: FileItem) {
        viewModelScope.launch {
            // Handle upload logic if needed
        }
    }
}

sealed class FileUiState {
    data object Loading : FileUiState()
    data class Success(val files: List<FileItem>) : FileUiState()
    data class Error(val message: String) : FileUiState()
}
