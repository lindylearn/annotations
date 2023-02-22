import {
    ImportProgress,
    backfillLibraryAnnotations,
} from "@unclutter/library-components/dist/common/import";
import {
    SettingsButton,
    SettingsGroup,
} from "@unclutter/library-components/dist/components/Settings/SettingsGroup";
import {
    ReplicacheContext,
    RuntimeReplicache,
    UserInfo,
} from "@unclutter/library-components/dist/store";
import { useContext, useEffect, useState } from "react";
import { reportEventPosthog } from "../../common/metrics";

export function GenerateSection({
    userInfo,
    darkModeEnabled,
}: {
    userInfo: UserInfo;
    darkModeEnabled: boolean;
}) {
    const rep = useContext(ReplicacheContext);

    const [generateProgress, setGenerateProgress] = useState<ImportProgress>();
    async function generateHighlights() {
        if (!rep) {
            return;
        }

        backfillLibraryAnnotations(rep, userInfo, setGenerateProgress);
        reportEventPosthog("startImport", {
            type: "highlights-backfill",
            articleCount: await rep.query.getArticlesCount(),
        });
    }

    return (
        <SettingsGroup
            title="Generate highlights"
            icon={
                <svg className="h-4 w-4" viewBox="0 0 576 512">
                    <path
                        fill="currentColor"
                        d="M248.8 4.994C249.9 1.99 252.8 .0001 256 .0001C259.2 .0001 262.1 1.99 263.2 4.994L277.3 42.67L315 56.79C318 57.92 320 60.79 320 64C320 67.21 318 70.08 315 71.21L277.3 85.33L263.2 123C262.1 126 259.2 128 256 128C252.8 128 249.9 126 248.8 123L234.7 85.33L196.1 71.21C193.1 70.08 192 67.21 192 64C192 60.79 193.1 57.92 196.1 56.79L234.7 42.67L248.8 4.994zM495.3 14.06L529.9 48.64C548.6 67.38 548.6 97.78 529.9 116.5L148.5 497.9C129.8 516.6 99.38 516.6 80.64 497.9L46.06 463.3C27.31 444.6 27.31 414.2 46.06 395.4L427.4 14.06C446.2-4.686 476.6-4.686 495.3 14.06V14.06zM461.4 48L351.7 157.7L386.2 192.3L495.1 82.58L461.4 48zM114.6 463.1L352.3 226.2L317.7 191.7L80 429.4L114.6 463.1zM7.491 117.2L64 96L85.19 39.49C86.88 34.98 91.19 32 96 32C100.8 32 105.1 34.98 106.8 39.49L128 96L184.5 117.2C189 118.9 192 123.2 192 128C192 132.8 189 137.1 184.5 138.8L128 160L106.8 216.5C105.1 221 100.8 224 96 224C91.19 224 86.88 221 85.19 216.5L64 160L7.491 138.8C2.985 137.1 0 132.8 0 128C0 123.2 2.985 118.9 7.491 117.2zM359.5 373.2L416 352L437.2 295.5C438.9 290.1 443.2 288 448 288C452.8 288 457.1 290.1 458.8 295.5L480 352L536.5 373.2C541 374.9 544 379.2 544 384C544 388.8 541 393.1 536.5 394.8L480 416L458.8 472.5C457.1 477 452.8 480 448 480C443.2 480 438.9 477 437.2 472.5L416 416L359.5 394.8C354.1 393.1 352 388.8 352 384C352 379.2 354.1 374.9 359.5 373.2z"
                    />
                </svg>
            }
            buttons={
                <SettingsButton
                    title="Generate highlights"
                    onClick={generateHighlights}
                    darkModeEnabled={darkModeEnabled}
                    reportEvent={reportEventPosthog}
                />
            }
            progress={generateProgress}
            animationIndex={1}
        >
            <p>
                From now on, Unclutter automatically creates AI highlights whenever you activate the
                reader mode. These are saved as untagged quotes in your library.
            </p>
            <p>Let's also generate quotes for your previously saved articles now.</p>
        </SettingsGroup>
    );
}
