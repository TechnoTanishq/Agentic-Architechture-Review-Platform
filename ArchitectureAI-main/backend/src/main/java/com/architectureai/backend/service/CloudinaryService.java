package com.architectureai.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Service to manage uploading and deleting images on Cloudinary.
 */
@Service
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Upload an image to Cloudinary.
     *
     * @param file the MultipartFile to upload
     * @return map of upload response data from Cloudinary containing "url", "public_id", etc.
     * @throws RuntimeException if upload fails due to I/O error
     */
    @SuppressWarnings("rawtypes")
    public Map uploadImage(MultipartFile file) {
        try {
            log.info("Uploading file '{}' to Cloudinary", file.getOriginalFilename());
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            log.info("Successfully uploaded file '{}' to Cloudinary (public_id: {})", 
                    file.getOriginalFilename(), uploadResult.get("public_id"));
            return uploadResult;
        } catch (IOException e) {
            log.error("Cloudinary upload failed for file '{}'", file.getOriginalFilename(), e);
            throw new RuntimeException("Failed to upload image to Cloudinary: " + e.getMessage(), e);
        }
    }

    /**
     * Delete an image from Cloudinary.
     *
     * @param publicId the public ID of the image on Cloudinary
     * @return map of delete response data from Cloudinary
     * @throws RuntimeException if delete fails
     */
    @SuppressWarnings("rawtypes")
    public Map deleteImage(String publicId) {
        try {
            log.info("Deleting file with public ID '{}' from Cloudinary", publicId);
            Map deleteResult = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Successfully deleted file with public ID '{}' from Cloudinary", publicId);
            return deleteResult;
        } catch (IOException e) {
            log.error("Cloudinary delete failed for public ID '{}'", publicId, e);
            throw new RuntimeException("Failed to delete image from Cloudinary: " + e.getMessage(), e);
        }
    }
}
