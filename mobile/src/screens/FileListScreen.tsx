import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFiles } from '../hooks/useFiles';
import { FileItem } from '../types/FileItem';
import { uploadFile } from '../api/fileApi';

export default function FileListScreen() {
  const { state, loadFiles } = useFiles();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        // Alert.alert('File selected', result.assets[0].name);
        await uploadFile({
          uri: result.assets[0].uri,
          name: result.assets[0].name,
        });

        loadFiles();
      }
    } catch(err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const openFile = (url: string) => {
    Linking.openURL(url);
  };

  if (state.type === 'loading') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>File Garage</Text>
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (state.type === 'error') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>File Garage</Text>
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <Text>Error: {state.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFiles}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const files = state.files;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>File Garage</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={loadFiles} style={styles.iconButton}>
              <Ionicons name="refresh" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickFile} style={styles.iconButton}>
              <Ionicons name="cloud-upload-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

        <FlatList
          data={files}
          keyExtractor={(item, index) => `${item.fileName}-${index}`}
          renderItem={({ item }: { item: FileItem }) => (
            <FileListItem file={item} onPress={() => openFile(item.url)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>No files found. Pull down to refresh or upload a file.</Text>
            </View>
          }
        />
      </View>
  );
}

function FileListItem({ file, onPress }: { file: FileItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Ionicons name="document-outline" size={24} color="#666" />
      <Text style={styles.fileName} numberOfLines={1}>
        {file.fileName}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerSafe: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
