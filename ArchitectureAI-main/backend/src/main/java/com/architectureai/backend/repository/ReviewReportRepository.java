package com.architectureai.backend.repository;

import com.architectureai.backend.entity.ReviewReport;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for {@link ReviewReport} entity database operations.
 */
@Repository
public interface ReviewReportRepository extends MongoRepository<ReviewReport, String> {

    /**
     * Find the single review report associated with a specific project.
     *
     * @param projectId the project ID
     * @return an Optional containing the ReviewReport if found
     */
    Optional<ReviewReport> findByProjectId(String projectId);
}
