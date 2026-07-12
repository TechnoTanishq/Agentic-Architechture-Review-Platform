package com.architectureai.backend.repository;

import com.architectureai.backend.entity.ProjectChat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for {@link ProjectChat} entity database operations.
 */
@Repository
public interface ProjectChatRepository extends MongoRepository<ProjectChat, String> {

    /**
     * Find all chat messages belonging to a specific project.
     *
     * @param projectId the project ID to look up
     * @param pageable  the pagination information
     * @return a page of matching ProjectChat documents
     */
    Page<ProjectChat> findAllByProjectId(String projectId, Pageable pageable);
}
