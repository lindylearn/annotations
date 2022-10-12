import React, { createContext, ReactNode, useContext, useState } from "react";
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { DragOverlay } from "@dnd-kit/core";
import { ArticlePreview } from "../Article/ArticlePreview";
import {
    Article,
    ArticleSortPosition,
    readingProgressFullClamp,
    ReplicacheContext,
} from "../../store";
import { getDomain } from "../../common";

export const CustomDraggableContext = createContext<{
    activeArticle: Article | null;
    activeListId: string | null;
    articleLists?: { [listId: string]: Article[] };
} | null>(null);

export default function DraggableContext({
    articleLists,
    setArticleLists,
    children,
    reportEvent = () => {},
}: {
    articleLists?: { [listId: string]: Article[] };
    setArticleLists: (articleLists: { [listId: string]: Article[] }) => void;
    children: ReactNode;
    reportEvent?: (event: string, properties?: any) => void;
}) {
    const rep = useContext(ReplicacheContext);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 15 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // set active (dragging) article for drag overlay
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [activeArticle, setActiveArticle] = useState<Article | null>(null);
    function handleDragStart({ active }: DragStartEvent) {
        if (!active.data.current || !articleLists) {
            return;
        }

        const sourceList = Object.keys(articleLists!).find((listId) =>
            articleLists[listId].some((a) => a.id === active.id)
        );
        setActiveListId(sourceList || null);
        if (sourceList) {
            const article = articleLists[sourceList].find(
                (a) => a.id === active.id
            );
            setActiveArticle(article || null);
        }
    }
    // move articles between lists
    function handleDragOver({ active, over }: DragOverEvent) {
        if (!articleLists || !over || !activeArticle || !activeListId) {
            return;
        }

        const sourceList = Object.keys(articleLists!).find((listId) =>
            articleLists[listId].some((a) => a.id === active.id)
        );
        const targetList = !over.data.current
            ? (over.id as string) // empty container
            : Object.keys(articleLists!).find((listId) =>
                  articleLists[listId].some((a) => a.id === over.id)
              );
        if (sourceList && targetList && sourceList !== targetList) {
            if (sourceList !== "queue" && targetList !== "queue") {
                // only allow moving from or to the reading queue for now
                return;
            }
            if (
                (targetList.endsWith("_") &&
                    activeArticle.topic_id !== targetList) ||
                (targetList.includes(".") &&
                    getDomain(activeArticle.url) !== targetList)
            ) {
                // only allow moving into topic or domain group if article has matching field
                return;
            }
            console.log(`move group ${sourceList} -> ${targetList}`);

            // only queue dragging supported for now
            rep?.mutate.updateArticle({
                id: activeArticle.id,
                is_queued: targetList === "queue",
                // // reset reading progress if already read
                // reading_progress:
                //     targetList === "queue" &&
                //     activeArticle.reading_progress > readingProgressFullClamp
                //         ? 0
                //         : activeArticle.reading_progress,
            });
            // position reorder handled pretty soon afterwards

            const targetIndex = articleLists[targetList].findIndex(
                (a) => a.id === over.id
            );

            articleLists[sourceList] = articleLists[sourceList].filter(
                (a) => a.id !== activeArticle.id
            );
            articleLists[targetList] = articleLists[targetList]
                .slice(0, targetIndex)
                .concat([activeArticle])
                .concat(articleLists[targetList].slice(targetIndex));
            setActiveListId(targetList);

            if (targetList === "queue") {
                reportEvent("addArticleToQueue");
            }
        }
    }
    // change position within target list
    function handleDragEnd({ active, over }: DragEndEvent) {
        if (!over || !articleLists || !activeListId) {
            return;
        }

        if (active.id !== over.id) {
            const oldIndex = articleLists[activeListId].findIndex(
                (a) => a.id === active.id
            );
            const newIndex = articleLists[activeListId].findIndex(
                (a) => a.id === over.id
            );
            // console.log(`move position ${oldIndex} -> ${newIndex}`);

            // check which sort order to modify
            let sortKey: ArticleSortPosition;
            if (activeListId === "list") {
                sortKey = "recency_sort_position";
            } else if (activeListId === "queue") {
                sortKey = "queue_sort_position";
            } else if (activeListId === "favorites") {
                sortKey = "favorites_sort_position";
            } else if (activeListId.endsWith("_")) {
                sortKey = "topic_sort_position";
            } else if (activeListId.includes(".")) {
                sortKey = "domain_sort_position";
            } else {
                console.error(
                    `Could not determine sort position to reorder for list ${activeListId}`
                );
                return;
            }

            // mutate replicache
            // moving an article to the right shifts successors one index to the left
            const newIndexShifted =
                oldIndex < newIndex ? newIndex + 1 : newIndex;
            const beforeNewArticle =
                articleLists[activeListId][newIndexShifted - 1];
            const afterNewArticle = articleLists[activeListId][newIndexShifted];
            rep?.mutate.moveArticlePosition({
                articleId: active.id as string,
                articleIdBeforeNewPosition: beforeNewArticle?.id || null,
                articleIdAfterNewPosition: afterNewArticle?.id || null,
                sortPosition: sortKey,
            });

            // update cache immediately (using unshifted index)
            // NOTE: moving this before the index access above breaks the sorting
            articleLists[activeListId] = arrayMove(
                articleLists[activeListId],
                oldIndex,
                newIndex
            );

            // update parent articleList once drag done (e.g. updates list counts)
            setArticleLists({ ...articleLists });
        }

        setActiveArticle(null);
        setActiveListId(null);

        reportEvent("reorderArticles");
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <CustomDraggableContext.Provider
                value={{
                    activeArticle: activeArticle,
                    activeListId,
                    articleLists,
                }}
            >
                {children}
                {/* render inside portal to handle parent margins */}
                {createPortal(
                    <DragOverlay
                        dropAnimation={{
                            duration: 300,
                            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
                        }}
                        className="article-drag-overlay"
                    >
                        {activeArticle && (
                            <ArticlePreview
                                listState="dragging"
                                article={activeArticle}
                                small
                            />
                        )}
                    </DragOverlay>,
                    document.body
                )}
            </CustomDraggableContext.Provider>
        </DndContext>
    );
}