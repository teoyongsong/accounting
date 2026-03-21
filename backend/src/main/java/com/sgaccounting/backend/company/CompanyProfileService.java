package com.sgaccounting.backend.company;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CompanyProfileService {

    private final ObjectMapper mapper = new ObjectMapper();
    private final Path file;

    public CompanyProfileService(
            @Value("${sg.accounting.company-profile-file:data/company-profile.json}") String relativePath) {
        this.file = Paths.get(relativePath).toAbsolutePath().normalize();
    }

    public synchronized CompanyProfile read() {
        try {
            if (!Files.exists(file)) {
                return new CompanyProfile();
            }
            return mapper.readValue(file.toFile(), CompanyProfile.class);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read company profile JSON: " + file, e);
        }
    }

    public synchronized CompanyProfile write(CompanyProfile incoming) {
        try {
            Path parent = file.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            CompanyProfile existing = read();
            CompanyProfile toSave = new CompanyProfile();

            // Merge semantics:
            // - If an incoming field is null, keep the existing value.
            // - This prevents overwriting logo fields when the frontend updates
            //   only business details.
            toSave.setName(incoming.getName() != null ? incoming.getName() : existing.getName());
            toSave.setAddress(incoming.getAddress() != null ? incoming.getAddress() : existing.getAddress());
            toSave.setPointOfContact(incoming.getPointOfContact() != null ? incoming.getPointOfContact() : existing.getPointOfContact());
            toSave.setEmail(incoming.getEmail() != null ? incoming.getEmail() : existing.getEmail());
            toSave.setContactNumber(incoming.getContactNumber() != null ? incoming.getContactNumber() : existing.getContactNumber());

            toSave.setLogoDataUrl(incoming.getLogoDataUrl() != null ? incoming.getLogoDataUrl() : existing.getLogoDataUrl());
            toSave.setLogoFileName(incoming.getLogoFileName() != null ? incoming.getLogoFileName() : existing.getLogoFileName());

            mapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), toSave);
            return toSave;
        } catch (IOException e) {
            throw new IllegalStateException("Cannot write company profile JSON: " + file, e);
        }
    }

    /**
     * Writes fields exactly as provided, including overwriting with nulls.
     * Use this for controller flows that intentionally set logo fields.
     */
    public synchronized CompanyProfile writeExact(CompanyProfile incoming) {
        try {
            Path parent = file.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            CompanyProfile toSave = new CompanyProfile();
            toSave.setName(incoming.getName() != null ? incoming.getName() : "");
            toSave.setAddress(incoming.getAddress());
            toSave.setPointOfContact(incoming.getPointOfContact());
            toSave.setEmail(incoming.getEmail());
            toSave.setContactNumber(incoming.getContactNumber());
            toSave.setLogoDataUrl(incoming.getLogoDataUrl());
            toSave.setLogoFileName(incoming.getLogoFileName());
            mapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), toSave);
            return toSave;
        } catch (IOException e) {
            throw new IllegalStateException("Cannot write company profile JSON: " + file, e);
        }
    }
}
