package com.sgaccounting.backend.company;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Stored as JSON on disk (no database table). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CompanyProfile {

    private String name = "";

    private String address;

    private String pointOfContact;

    private String email;

    private String contactNumber;

    /**
     * Stored as a data URL (e.g. data:image/png;base64,...) so we don't need
     * separate file storage / static serving.
     */
    private String logoDataUrl;

    /**
     * Stored as a filename under the server logo directory.
     * Example: "d3f9e3a1-2f0a-4e0d-8a62-1c0fb4d3c2a1.png"
     */
    private String logoFileName;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name != null ? name : "";
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPointOfContact() {
        return pointOfContact;
    }

    public void setPointOfContact(String pointOfContact) {
        this.pointOfContact = pointOfContact;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getContactNumber() {
        return contactNumber;
    }

    public void setContactNumber(String contactNumber) {
        this.contactNumber = contactNumber;
    }

    public String getLogoDataUrl() {
        return logoDataUrl;
    }

    public void setLogoDataUrl(String logoDataUrl) {
        this.logoDataUrl = logoDataUrl;
    }

    public String getLogoFileName() {
        return logoFileName;
    }

    public void setLogoFileName(String logoFileName) {
        this.logoFileName = logoFileName;
    }
}
