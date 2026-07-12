package com.architectureai.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.time.Duration;

/**
 * Client service for the Python ArchEval FastAPI AI review pipeline.
 *
 * <p>Exposes two operations:
 * <ol>
 *   <li>{@link #parseImage(String)} — fetches the diagram from its Cloudinary URL and
 *       forwards it to {@code POST /parse}, returning an {@code ArchitecturalGraph} JSON node.</li>
 *   <li>{@link #runReview(JsonNode)} — sends the parsed graph to {@code POST /review},
 *       returning the full pipeline result JSON node.</li>
 * </ol>
 * </p>
 *
 * <p>Both calls are made synchronously (blocking on the reactive result) because they are
 * invoked from an {@code @Async} virtual-thread context in {@link ReviewService}.</p>
 */
@Service
@Slf4j
public class AiReviewService {

    private static final int DOWNLOAD_TIMEOUT_SECONDS = 30;

    private final WebClient aiWebClient;
    private final ObjectMapper objectMapper;

    public AiReviewService(WebClient aiWebClient, ObjectMapper objectMapper) {
        this.aiWebClient = aiWebClient;
        this.objectMapper = objectMapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1 — Parse diagram image
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Download the architecture diagram from {@code diagramUrl} and send it to the
     * Python service's {@code POST /parse} endpoint.
     *
     * @param diagramUrl the Cloudinary URL of the uploaded diagram
     * @return parsed {@code ArchitecturalGraph} as a {@link JsonNode}
     * @throws AiServiceException if the download or the AI call fails
     */
    public JsonNode parseImage(String diagramUrl) {
        log.info("[AiReviewService] Downloading diagram from: {}", diagramUrl);

        byte[] imageBytes = downloadImage(diagramUrl);
        String filename = extractFilename(diagramUrl);

        log.info("[AiReviewService] Sending {} bytes to POST /parse", imageBytes.length);

        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        bodyBuilder.part("image", new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() { return filename; }
        }).contentType(MediaType.IMAGE_JPEG);

        try {
            String responseBody = aiWebClient.post()
                    .uri("/parse")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();

            log.info("[AiReviewService] /parse returned successfully");
            return objectMapper.readTree(responseBody);

        } catch (WebClientResponseException e) {
            log.error("[AiReviewService] /parse failed — HTTP {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiServiceException("Image parsing failed (HTTP " + e.getStatusCode() + "): " + e.getResponseBodyAsString(), e);
        } catch (IOException e) {
            log.error("[AiReviewService] Failed to parse /parse response JSON", e);
            throw new AiServiceException("Failed to parse response from AI service", e);
        } catch (Exception e) {
            log.error("[AiReviewService] Unexpected error during /parse", e);
            throw new AiServiceException("Unexpected error calling AI parse service: " + e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2 — Run multi-agent review
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Send the parsed architectural graph to {@code POST /review} and return the
     * full pipeline result including all agent findings and the final scored report.
     *
     * @param parsedGraph the {@code ArchitecturalGraph} JSON node returned by
     *                    {@link #parseImage(String)}
     * @return full review result as a {@link JsonNode}
     * @throws AiServiceException if the AI call fails
     */
    public JsonNode runReview(JsonNode parsedGraph) {
        log.info("[AiReviewService] Sending parsed graph to POST /review");

        // Build the review request body: { "graph": <parsedGraph> }
        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.set("graph", parsedGraph);

        try {
            String responseBody = aiWebClient.post()
                    .uri("/review")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody.toString())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(120))
                    .block();

            log.info("[AiReviewService] /review returned successfully");
            return objectMapper.readTree(responseBody);

        } catch (WebClientResponseException e) {
            log.error("[AiReviewService] /review failed — HTTP {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiServiceException("Review pipeline failed (HTTP " + e.getStatusCode() + "): " + e.getResponseBodyAsString(), e);
        } catch (IOException e) {
            log.error("[AiReviewService] Failed to parse /review response JSON", e);
            throw new AiServiceException("Failed to parse response from AI review service", e);
        } catch (Exception e) {
            log.error("[AiReviewService] Unexpected error during /review", e);
            throw new AiServiceException("Unexpected error calling AI review service: " + e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private byte[] downloadImage(String imageUrl) {
        try {
            URI uri = URI.create(imageUrl);
            try (InputStream is = uri.toURL().openStream()) {
                return is.readAllBytes();
            }
        } catch (IOException e) {
            log.error("[AiReviewService] Failed to download image from {}", imageUrl, e);
            throw new AiServiceException("Failed to download diagram image from: " + imageUrl, e);
        }
    }

    private String extractFilename(String url) {
        try {
            String path = new URL(url).getPath();
            String[] parts = path.split("/");
            String last = parts[parts.length - 1];
            // Cloudinary URLs sometimes carry query params on the filename segment
            return last.contains("?") ? last.substring(0, last.indexOf('?')) : last;
        } catch (Exception e) {
            return "diagram.jpg";
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Checked exception wrapper
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Runtime exception wrapping any failure communicating with the AI service.
     */
    public static class AiServiceException extends RuntimeException {
        public AiServiceException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
