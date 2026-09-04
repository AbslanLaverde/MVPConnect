package com.mint.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.mint.dto.request.support.StrictBooleanDeserializer;
import com.mint.dto.request.support.StrictStringDeserializer;
import com.mint.validation.HttpUrl;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class UpdateMusicianProfileRequest {

    @JsonDeserialize(using = StrictStringDeserializer.class)
    private String bio;
    @JsonIgnore
    private boolean bioPresent;

    @JsonDeserialize(using = StrictStringDeserializer.class)
    private String location;
    @JsonIgnore
    private boolean locationPresent;

    @JsonDeserialize(contentUsing = StrictStringDeserializer.class)
    private List<@NotNull String> genres;
    @JsonIgnore
    private boolean genresPresent;

    @JsonDeserialize(contentUsing = StrictStringDeserializer.class)
    private List<@NotNull String> vibes;
    @JsonIgnore
    private boolean vibesPresent;

    @JsonDeserialize(using = StrictStringDeserializer.class)
    private String minimumFee;
    @JsonIgnore
    private boolean minimumFeePresent;

    @JsonDeserialize(using = StrictBooleanDeserializer.class)
    private Boolean willingToTravel;
    @JsonIgnore
    private boolean willingToTravelPresent;

    @HttpUrl
    @JsonDeserialize(using = StrictStringDeserializer.class)
    private String websiteUrl;
    @JsonIgnore
    private boolean websiteUrlPresent;

    @JsonDeserialize(using = StrictStringDeserializer.class)
    private String instagramHandle;
    @JsonIgnore
    private boolean instagramHandlePresent;

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
        this.bioPresent = true;
    }

    public boolean hasBio() {
        return bioPresent;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
        this.locationPresent = true;
    }

    public boolean hasLocation() {
        return locationPresent;
    }

    public List<String> getGenres() {
        return genres;
    }

    public void setGenres(List<String> genres) {
        this.genres = genres;
        this.genresPresent = true;
    }

    public boolean hasGenres() {
        return genresPresent;
    }

    public List<String> getVibes() {
        return vibes;
    }

    public void setVibes(List<String> vibes) {
        this.vibes = vibes;
        this.vibesPresent = true;
    }

    public boolean hasVibes() {
        return vibesPresent;
    }

    public String getMinimumFee() {
        return minimumFee;
    }

    public void setMinimumFee(String minimumFee) {
        this.minimumFee = minimumFee;
        this.minimumFeePresent = true;
    }

    public boolean hasMinimumFee() {
        return minimumFeePresent;
    }

    public Boolean getWillingToTravel() {
        return willingToTravel;
    }

    public void setWillingToTravel(Boolean willingToTravel) {
        this.willingToTravel = willingToTravel;
        this.willingToTravelPresent = true;
    }

    public boolean hasWillingToTravel() {
        return willingToTravelPresent;
    }

    public String getWebsiteUrl() {
        return websiteUrl;
    }

    public void setWebsiteUrl(String websiteUrl) {
        this.websiteUrl = websiteUrl;
        this.websiteUrlPresent = true;
    }

    public boolean hasWebsiteUrl() {
        return websiteUrlPresent;
    }

    public String getInstagramHandle() {
        return instagramHandle;
    }

    public void setInstagramHandle(String instagramHandle) {
        this.instagramHandle = instagramHandle;
        this.instagramHandlePresent = true;
    }

    public boolean hasInstagramHandle() {
        return instagramHandlePresent;
    }

    @JsonAnySetter
    public void rejectUnknownField(String fieldName, Object ignoredValue) {
        throw new IllegalArgumentException("Unknown musician profile field: " + fieldName);
    }
}
