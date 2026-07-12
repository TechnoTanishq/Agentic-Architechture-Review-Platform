package com.architectureai.backend.repository;

import com.architectureai.backend.entity.AgentOutput;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for {@link AgentOutput} entity database operations.
 */
@Repository
public interface AgentOutputRepository extends MongoRepository<AgentOutput, String> {

    /**
     * Find all specialist agent outputs belonging to a specific project.
     *
     * @param projectId the project ID
     * @return list of matching AgentOutput documents
     */
    List<AgentOutput> findAllByProjectId(String projectId);
}
