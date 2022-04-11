import {
    allowlistDomainOnManualActivationFeatureFlag,
    getFeatureFlag,
} from "source/common/featureFlags";
import {
    getUserSettingForDomain,
    setUserSettingsForDomain,
} from "source/common/storage";
import {
    insertPageSettings,
    updateDomainState,
    whiggleDomainState,
} from "../overlay/insert";
import { getElementYOffset } from "../overlay/outline/common";
import Outline from "../overlay/outline/Outline.svelte";
import { getOutline, OutlineItem } from "../overlay/outline/parse";
import ThemeModifier from "./CSSOM/theme";
import { PageModifier, trackModifierExecution } from "./_interface";

@trackModifierExecution
export default class OverlayManager implements PageModifier {
    private domain: string;
    private themeModifier: ThemeModifier;

    private outline: OutlineItem;
    private outlineSvelteComponent: Outline;

    constructor(domain: string, themeModifier: ThemeModifier) {
        this.domain = domain;
        this.themeModifier = themeModifier;
    }

    async afterTransitionIn() {
        insertPageSettings(this.domain, this.themeModifier);

        const domainSetting = await getUserSettingForDomain(this.domain);
        const allowlistOnActivation = await getFeatureFlag(
            allowlistDomainOnManualActivationFeatureFlag
        );

        if (domainSetting === "allow") {
            whiggleDomainState();
        } else if (allowlistOnActivation && domainSetting === null) {
            const newDomainSetting = "allow";

            await setUserSettingsForDomain(this.domain, newDomainSetting);
            updateDomainState(newDomainSetting, this.domain);

            whiggleDomainState();
        }

        // sometimes content block takes time
        // TODO ensure afterTransitionIn() actually runs later?
        // https://www.quantamagazine.org/researchers-identify-master-problem-underlying-all-cryptography-20220406/
        // setTimeout(() => {
        let headingCount: number;
        [this.outline, headingCount] = getOutline();
        if (headingCount < 3) {
            return;
        }

        this.insertOutline();
        this.listenToOutlineScroll();
        // }, 500);

        // this should be experimental
        // would also need to update URL during scrolling
        // scrollToFragmentHeading();
    }

    private insertOutline() {
        const container = document.createElement("iframe");
        container.id = "lindy-info-topleft";
        container.frameBorder = "0";
        container.scrolling = "no";
        document.documentElement.appendChild(container);

        this.outlineSvelteComponent = new Outline({
            target: container.contentDocument.body,
            props: { outline: this.outline, activeOutlineIndex: 0 },
        });
    }

    private uninstallScrollListener: () => void;
    private listenToOutlineScroll() {
        function flatten(item: OutlineItem): OutlineItem[] {
            return [item].concat(item.children.flatMap(flatten));
        }
        const flatOutline = flatten(this.outline);

        // listen to scroll changes, compare to last header
        let currentOutlineIndex = 0;
        let lowTheshold: number;
        let highTheshold: number;

        const updateTresholds = () => {
            const margin = 20; // a bit more than the auto scroll margin
            lowTheshold = getElementYOffset(
                flatOutline[currentOutlineIndex].element,
                margin
            );
            if (currentOutlineIndex + 1 < flatOutline.length) {
                highTheshold = getElementYOffset(
                    flatOutline[currentOutlineIndex + 1].element,
                    margin
                );
            } else {
                highTheshold = Infinity;
            }
        };
        updateTresholds();

        const scollListener = () => {
            if (window.scrollY === 0) {
                // start of document
                currentOutlineIndex = 0;
                updateTresholds();
            } else if (
                window.scrollY + window.innerHeight >=
                document.documentElement.scrollHeight - 20
            ) {
                // end of document
                currentOutlineIndex = flatOutline.length - 1;
                updateTresholds();
            } else if (
                currentOutlineIndex > 0 &&
                window.scrollY < lowTheshold
            ) {
                // scrolled up
                currentOutlineIndex -= 1;
                updateTresholds();
            } else if (window.scrollY >= highTheshold) {
                // scrolled down
                currentOutlineIndex += 1;
                updateTresholds();
            }

            const currentHeading = flatOutline[currentOutlineIndex];
            this.outlineSvelteComponent.$set({
                activeOutlineIndex: currentHeading.index,
            });
        };
        document.addEventListener("scroll", scollListener);

        this.uninstallScrollListener = () =>
            document.removeEventListener("scroll", scollListener);
    }

    async transitionOut() {
        document
            .getElementById("lindy-info-topleft")
            .classList.add("lindy-overlay-fadeout");
    }

    async afterTransitionOut() {
        document
            .querySelectorAll(
                ".lindy-page-settings-topright, .lindy-page-settings-pageadjacent, .lindy-info-topleft"
            )
            .forEach((e) => e.remove());

        if (this.uninstallScrollListener) {
            this.uninstallScrollListener();
        }
    }
}
