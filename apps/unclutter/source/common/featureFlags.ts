import browser from "./polyfill";

export async function getFeatureFlag(key) {
    if (key in featureFlagLocalOverrides) {
        return featureFlagLocalOverrides[key];
    }

    const config = await browser.storage.sync.get([key]);
    return (config[key] !== undefined ? config[key] : defaultFeatureFlags[key]) || false;
}
export async function setFeatureFlag(key, status) {
    await browser.storage.sync.set({ [key]: status });
}

export async function getAllFeatureFlags() {
    const reportedFlags = [
        allowlistDomainOnManualActivationFeatureFlag,
        enableBootUnclutterMessage,
        hypothesisSyncFeatureFlag,
        enableSocialCountsFeatureFlag,
        enableAnnotationsFeatureFlag,
        enableSocialCommentsFeatureFlag,
        submittedFeedbackFlag,
        enableExperimentalFeatures,
        dismissedLibrarySignupMessage,
    ];

    // does not include defaultFeatureFlags
    const config = await browser.storage.sync.get(reportedFlags);

    return config;
}

export const allowlistDomainOnManualActivationFeatureFlag = "allowlist-domain-manual-activation";
export const enableBootUnclutterMessage = "enable-boot-unclutter-message";
export const enableArchiveDetection = "enable-archive-detection";
export const isDevelopmentFeatureFlag = "is-dev";
export const hypothesisSyncFeatureFlag = "hypothesis-sync";
export const enableSocialCountsFeatureFlag = "social-annotations-counts-enabled";
export const enableExperimentalFeatures = "enable-experimental-features";

// sticky user setting
export const enableAnnotationsFeatureFlag = "annotations-enabled2";
export const enableSocialCommentsFeatureFlag = "social-annotations-enabled";

export const submittedFeedbackFlag = "submitted-feedback";
export const dismissedLibrarySignupMessage = "dismissed-library-signup-message";

// remote
export const showFeedbackMessage = "show-feedback-message";
export const showLibrarySignupFlag = "show-library-signup";

export const defaultFeatureFlags = {
    [allowlistDomainOnManualActivationFeatureFlag]: false,
    [enableBootUnclutterMessage]: false,
    [isDevelopmentFeatureFlag]: false,
    [enableSocialCountsFeatureFlag]: true,

    [enableAnnotationsFeatureFlag]: false,
    [enableSocialCommentsFeatureFlag]: true,

    [submittedFeedbackFlag]: false,
};

const featureFlagLocalOverrides = {};
