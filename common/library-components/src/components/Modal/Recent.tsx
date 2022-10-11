import partition from "lodash/partition";
import { DraggableArticleList, useTabInfos, TabInfo } from "../../components";
import React, { ReactNode, useContext, useEffect, useState } from "react";
import { getRandomLightColor, reportEventContentScript } from "../../common";
import {
    Article,
    readingProgressFullClamp,
    ReplicacheContext,
    Topic,
} from "../../store";
import { ReadingProgress, ResourceIcon } from "./numbers";
import { UserInfo } from "../../store/user";
import clsx from "clsx";

export default function RecentModalTab({
    userInfo,
    currentTopic,
    darkModeEnabled,
    showTopic,
    reportEvent = () => {},
}: {
    userInfo: UserInfo;
    currentTopic?: Topic;
    darkModeEnabled: boolean;
    showTopic: (topic: Topic) => void;
    reportEvent?: (event: string, data?: any) => void;
}) {
    let [tabInfos, setTabInfos] = useState<TabInfo[]>();
    if (userInfo.topicsEnabled) {
        tabInfos = useTabInfos(10, true, null)[0];
    } else {
        const rep = useContext(ReplicacheContext);
        useEffect(() => {}, []);
        useEffect(() => {
            rep?.query.listRecentArticles(undefined, "all").then((articles) => {
                const [readArticles, unreadArticles] = partition(
                    articles,
                    (a) => a.reading_progress >= readingProgressFullClamp
                );
                setTabInfos([
                    {
                        key: "queue",
                        title: "Reading queue",
                        articles: [],
                        articleLines: 1,
                    },
                    {
                        key: "unread",
                        title: "Unread articles",
                        articles: unreadArticles,
                        articleLines: 5,
                    },
                ]);
            });
        }, []);
    }

    // TODO ensure currentTopic is present and first in list

    return (
        <div className="flex flex-col gap-4">
            <PageFilters />

            {tabInfos?.map((tabInfo) => {
                const GroupComponent = tabInfo.isTopic
                    ? TopicGroup
                    : ArticleGroup;

                return (
                    <GroupComponent
                        {...tabInfo}
                        color={
                            darkModeEnabled
                                ? "hsl(51, 80%, 43%)"
                                : "hsl(51, 80%, 64%)"
                        }
                        darkModeEnabled={darkModeEnabled}
                        showTopic={showTopic}
                        reportEvent={reportEvent}
                    />
                );
            })}
        </div>
    );
}

function PageFilters({}) {
    return (
        <div className="flex justify-start gap-3">
            <div className="flex cursor-default select-none items-center gap-2 rounded-md bg-stone-50 px-2 py-1 font-medium transition-transform hover:scale-[97%] dark:bg-neutral-800">
                <ResourceIcon type="articles" />
                {/* <svg className="h-4" viewBox="0 0 512 512">
                    <path
                        fill="currentColor"
                        d="M0 73.7C0 50.67 18.67 32 41.7 32H470.3C493.3 32 512 50.67 512 73.7C512 83.3 508.7 92.6 502.6 100L336 304.5V447.7C336 465.5 321.5 480 303.7 480C296.4 480 289.3 477.5 283.6 472.1L191.1 399.6C181.6 392 176 380.5 176 368.3V304.5L9.373 100C3.311 92.6 0 83.3 0 73.7V73.7zM54.96 80L218.6 280.8C222.1 285.1 224 290.5 224 296V364.4L288 415.2V296C288 290.5 289.9 285.1 293.4 280.8L457 80H54.96z"
                    />
                </svg> */}
                Unread articles
            </div>
            <div className="flex cursor-default select-none items-center gap-2 rounded-md bg-stone-50 px-2 py-1 font-medium transition-transform hover:scale-[97%] dark:bg-neutral-800">
                <svg className="h-4" viewBox="0 0 512 512">
                    <path
                        fill="currentColor"
                        d="M416 320h-96c-17.6 0-32 14.4-32 32v96c0 17.6 14.4 32 32 32h96c17.6 0 32-14.4 32-32v-96C448 334.4 433.6 320 416 320zM400 432h-64v-64h64V432zM480 32h-160c-17.67 0-32 14.33-32 32v160c0 17.67 14.33 32 32 32h160c17.67 0 32-14.33 32-32V64C512 46.33 497.7 32 480 32zM464 208h-128v-128h128V208zM145.6 39.37c-9.062-9.82-26.19-9.82-35.25 0L14.38 143.4c-9 9.758-8.406 24.96 1.344 33.94C20.35 181.7 26.19 183.8 32 183.8c6.469 0 12.91-2.594 17.62-7.719L104 117.1v338.9C104 469.2 114.8 480 128 480s24-10.76 24-24.02V117.1l54.37 58.95C215.3 185.8 230.5 186.5 240.3 177.4C250 168.4 250.6 153.2 241.6 143.4L145.6 39.37z"
                    />
                </svg>
                Last added
            </div>
        </div>
    );
}

function TopicGroup(
    props: TabInfo & {
        darkModeEnabled: boolean;
        showTopic: (topic: Topic) => void;
        reportEvent?: (event: string, data?: any) => void;
    }
) {
    const rep = useContext(ReplicacheContext);

    const [groupArticles, setGroupArticles] = useState<Article[]>([]);
    const [topic, setTopic] = useState<Topic>();
    const [color, setColor] = useState<string>();
    useEffect(() => {
        const topic_id = props.articles[0]?.topic_id!;
        rep?.query.listTopicArticles(topic_id).then(setGroupArticles);
        rep?.query.getTopic(topic_id).then(setTopic);

        setColor(getRandomLightColor(topic_id, props.darkModeEnabled));
    }, [rep]);

    return (
        <ArticleGroup
            {...props}
            articles={groupArticles}
            articleLines={1}
            color={color}
            onTitleClick={() => props.showTopic(topic!)}
        />
    );
}

function ArticleGroup({
    title,
    icon,
    color,
    articles,
    articleLines = 1,
    darkModeEnabled,
    onTitleClick,
    reportEvent = () => {},
}: {
    title: string;
    icon?: ReactNode;
    color?: string;
    articles: Article[];
    articleLines?: number;
    darkModeEnabled: boolean;
    onTitleClick?: () => void;
    reportEvent?: (event: string, data?: any) => void;
}) {
    return (
        <div className="topic animate-fadein">
            <div className="topic-header mx-0.5 mb-2 flex justify-between">
                <h2
                    className={clsx(
                        "title flex select-none items-center gap-2 font-medium",
                        onTitleClick &&
                            "cursor-pointer transition-transform hover:scale-[96%]"
                    )}
                    onClick={onTitleClick}
                >
                    {icon}
                    {title}
                </h2>
                <div className="stats flex gap-2 font-medium">
                    <ReadingProgress
                        className="relative"
                        articleCount={articles?.length}
                        readCount={
                            articles?.filter(
                                (a) =>
                                    a.reading_progress >=
                                    readingProgressFullClamp
                            )?.length
                        }
                        color={color}
                    />
                </div>
            </div>
            <div
                className="topic-articles relative rounded-md p-3"
                style={{
                    height: `${
                        11.5 * articleLines - 0.75 * (articleLines - 1)
                    }rem`, // article height + padding to prevent size change
                    background: color,
                }}
            >
                <DraggableArticleList
                    articles={articles}
                    articlesToShow={5 * articleLines}
                    sortPosition="topic_sort_position"
                    small
                    reportEvent={reportEvent}
                />
                {title === "Reading queue" && (
                    <div className="absolute top-0 left-0 flex h-full w-full select-none items-center justify-center">
                        Drag articles here to add them to your queue
                    </div>
                )}
            </div>
        </div>
    );
}
