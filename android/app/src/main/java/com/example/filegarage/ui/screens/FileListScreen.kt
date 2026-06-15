package com.example.filegarage.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.filegarage.ui.viewmodel.FileUiState
import com.example.filegarage.ui.viewmodel.FileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FileListScreen(
    viewModel: FileViewModel = viewModel()
) {
    val context = LocalContext.current
    var showUploadDialog by remember { mutableStateOf(false) }

    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            // Handle file upload here
            // For now, just refresh the list
            viewModel.loadFiles()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("File Garage") },
                actions = {
                    IconButton(onClick = { viewModel.loadFiles() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                    IconButton(onClick = { showUploadDialog = true }) {
                        Icon(Icons.Default.CloudUpload, contentDescription = "Upload")
                    }
                }
            )
        }
    ) { paddingValues ->
        when (val state = viewModel.uiState) {
            is FileUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            is FileUiState.Success -> {
                val pullToRefreshState = rememberPullToRefreshState()
                var isRefreshing by remember { mutableStateOf(false) }

                PullToRefreshBox(
                    isRefreshing = isRefreshing,
                    onRefresh = {
                        isRefreshing = true
                        viewModel.loadFiles()
                        isRefreshing = false
                    },
                    state = pullToRefreshState,
                    modifier = Modifier.padding(paddingValues)
                ) {
                    if (state.files.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No files found. Pull down to refresh or upload a file.")
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.files) { file ->
                                FileListItem(
                                    fileName = file.fileName,
                                    onClick = {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(file.url))
                                        context.startActivity(intent)
                                    }
                                )
                            }
                        }
                    }
                }
            }

            is FileUiState.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Error: ${state.message}")
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadFiles() }) {
                            Text("Retry")
                        }
                    }
                }
            }
        }
    }

    // Upload dialog
    if (showUploadDialog) {
        AlertDialog(
            onDismissRequest = { showUploadDialog = false },
            title = { Text("Upload File") },
            text = { Text("Select a file to upload") },
            confirmButton = {
                TextButton(onClick = {
                    showUploadDialog = false
                    filePickerLauncher.launch("*/*")
                }) {
                    Text("Choose File")
                }
            },
            dismissButton = {
                TextButton(onClick = { showUploadDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun FileListItem(
    fileName: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Description,
                contentDescription = null,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Text(
                text = fileName,
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}
