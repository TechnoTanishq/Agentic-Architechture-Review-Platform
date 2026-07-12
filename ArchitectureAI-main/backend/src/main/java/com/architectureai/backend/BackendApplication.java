package com.architectureai.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Application entry point.
 *
 * <p>{@code @EnableAsync} activates Spring's asynchronous method execution,
 * used by {@link com.architectureai.backend.service.ReviewService#triggerReview}
 * to run the AI pipeline on a virtual-thread executor without blocking the HTTP thread.</p>
 */
@SpringBootApplication
@EnableAsync
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}
}
