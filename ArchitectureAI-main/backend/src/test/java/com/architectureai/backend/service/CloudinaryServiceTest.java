package com.architectureai.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CloudinaryServiceTest {

    @Mock
    private Cloudinary cloudinary;

    @Mock
    private Uploader uploader;

    private CloudinaryService cloudinaryService;

    @BeforeEach
    void setUp() {
        cloudinaryService = new CloudinaryService(cloudinary);
    }

    @Test
    @SuppressWarnings("unchecked")
    void uploadImage_Success() throws IOException {
        // Arrange
        MultipartFile file = new MockMultipartFile("file", "diagram.png", "image/png", "mock image data".getBytes());
        Map<String, Object> uploadResult = Map.of(
                "url", "http://cloudinary.com/diagram.png",
                "public_id", "diagram_123"
        );

        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), any(Map.class))).thenReturn(uploadResult);

        // Act
        Map<?, ?> result = cloudinaryService.uploadImage(file);

        // Assert
        assertNotNull(result);
        assertEquals("http://cloudinary.com/diagram.png", result.get("url"));
        assertEquals("diagram_123", result.get("public_id"));
        verify(uploader, times(1)).upload(eq(file.getBytes()), any(Map.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void uploadImage_ThrowsException_OnIOException() throws IOException {
        // Arrange
        MultipartFile file = new MockMultipartFile("file", "diagram.png", "image/png", "mock image data".getBytes());

        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(byte[].class), any(Map.class))).thenThrow(new IOException("Upload failed"));

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> cloudinaryService.uploadImage(file));
        assertTrue(exception.getMessage().contains("Failed to upload image"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void deleteImage_Success() throws IOException {
        // Arrange
        String publicId = "diagram_123";
        Map<String, Object> deleteResult = Map.of("result", "ok");

        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.destroy(eq(publicId), any(Map.class))).thenReturn(deleteResult);

        // Act
        Map<?, ?> result = cloudinaryService.deleteImage(publicId);

        // Assert
        assertNotNull(result);
        assertEquals("ok", result.get("result"));
        verify(uploader, times(1)).destroy(eq(publicId), any(Map.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void deleteImage_ThrowsException_OnIOException() throws IOException {
        // Arrange
        String publicId = "diagram_123";

        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.destroy(eq(publicId), any(Map.class))).thenThrow(new IOException("Delete failed"));

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> cloudinaryService.deleteImage(publicId));
        assertTrue(exception.getMessage().contains("Failed to delete image"));
    }
}
