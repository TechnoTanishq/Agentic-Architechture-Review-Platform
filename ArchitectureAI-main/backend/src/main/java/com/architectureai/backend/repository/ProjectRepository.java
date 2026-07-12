package com.architectureai.backend.repository;

import com.architectureai.backend.entity.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for {@link Project} entity database operations.
 */
@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {

    /**
     * Find all projects whose IDs are in the given list.
     *
     * @param ids the list of project IDs to look up
     * @return list of matching Project documents
     */
    List<Project> findAllByIdIn(List<String> ids);
}
