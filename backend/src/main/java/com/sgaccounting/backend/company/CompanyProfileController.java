package com.sgaccounting.backend.company;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/company-profile")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class CompanyProfileController {

    private final CompanyProfileService service;
    private final Path logoDir;

    public CompanyProfileController(
            CompanyProfileService service,
            @Value("${sg.accounting.company-logo-dir:data/company-logos}") String logoDir) {
        this.service = service;
        this.logoDir = Paths.get(logoDir).toAbsolutePath().normalize();
    }

    private static String extensionFromFileName(String originalFilename) {
        if (originalFilename == null) return "";
        int dot = originalFilename.lastIndexOf('.');
        if (dot < 0 || dot == originalFilename.length() - 1) return "";
        return originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static MediaType mediaTypeForExtension(String ext) {
        if ("png".equals(ext)) return MediaType.IMAGE_PNG;
        if ("jpg".equals(ext) || "jpeg".equals(ext)) return MediaType.IMAGE_JPEG;
        if ("webp".equals(ext)) return MediaType.valueOf("image/webp");
        if ("gif".equals(ext)) return MediaType.valueOf("image/gif");
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    @GetMapping
    public CompanyProfile get() {
        return service.read();
    }

    @PutMapping
    public CompanyProfile update(@RequestBody CompanyProfile body) {
        return service.write(body);
    }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CompanyProfile> uploadLogo(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (file.getSize() > 1_500_000) {
            return ResponseEntity.badRequest().build();
        }
        String original = file.getOriginalFilename();
        String ext = extensionFromFileName(original);
        if (ext.isEmpty()) {
            ext = file.getContentType() != null ? file.getContentType().replace("image/", "") : "";
        }
        ext = ext.toLowerCase(Locale.ROOT);
        if (ext.equals("svg")) {
            return ResponseEntity.badRequest().build();
        }

        String allowedExt = "";
        switch (ext) {
            case "png":
            case "jpg":
            case "jpeg":
            case "webp":
            case "gif":
                allowedExt = ext;
                break;
            default:
                break;
        }
        if (allowedExt == null || allowedExt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            Files.createDirectories(logoDir);

            CompanyProfile existing = service.read();
            // Replace existing file (single-logo semantics).
            if (existing.getLogoFileName() != null) {
                Files.deleteIfExists(logoDir.resolve(existing.getLogoFileName()));
            }

            String newFileName = UUID.randomUUID().toString() + "." + allowedExt;
            Path target = logoDir.resolve(newFileName);
            Files.copy(file.getInputStream(), target);

            existing.setLogoFileName(newFileName);
            // Clear data-url to keep JSON small.
            existing.setLogoDataUrl(null);
            CompanyProfile saved = service.writeExact(existing);
            return ResponseEntity.ok(saved);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping(value = "/logo")
    public ResponseEntity<byte[]> getLogo() {
        CompanyProfile existing = service.read();
        String fileName = existing.getLogoFileName();
        if (fileName == null || fileName.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        Path path = logoDir.resolve(fileName).normalize();
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }
        try {
            byte[] bytes = Files.readAllBytes(path);
            String ext = extensionFromFileName(fileName);
            MediaType contentType = mediaTypeForExtension(ext);
            return ResponseEntity.ok().contentType(contentType).body(bytes);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping(value = "/logo")
    public ResponseEntity<CompanyProfile> deleteLogo() {
        CompanyProfile existing = service.read();
        if (existing.getLogoFileName() == null) {
            existing.setLogoDataUrl(null);
            return ResponseEntity.ok(service.writeExact(existing));
        }
        try {
            Files.deleteIfExists(logoDir.resolve(existing.getLogoFileName()));
            existing.setLogoFileName(null);
            existing.setLogoDataUrl(null);
            return ResponseEntity.ok(service.writeExact(existing));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
