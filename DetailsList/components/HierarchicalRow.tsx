/**
 * HierarchicalRow.tsx
 * Enterprise-grade hierarchical row component with expand/collapse chevron
 * Built to Meta/Google performance standards
 */

import * as React from 'react';
import { Icon, Spinner, SpinnerSize } from '@fluentui/react';
import { HierarchyNode } from '../types/Hierarchy.types';

export interface HierarchicalRowProps {
    node: HierarchyNode;
    indentSize: number;
    onToggleExpand: (nodeId: string) => void;
    children: React.ReactNode;
    isLoading?: boolean;
    showChevron?: boolean;
}

export interface ChevronIconProps {
    isExpanded: boolean;
    hasChildren: boolean;
    isLoading: boolean;
    onClick: () => void;
    size?: number;
}

/**
 * Chevron icon component with smooth animation
 */
export const ChevronIcon: React.FC<ChevronIconProps> = React.memo(({
    isExpanded,
    hasChildren,
    isLoading,
    onClick,
    size = 16,
}) => {
    if (!hasChildren) {
        return <div style={{ width: size, height: size, display: 'inline-block' }} />;
    }

    if (isLoading) {
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size }}>
                <Spinner size={SpinnerSize.xSmall} />
            </div>
        );
    }

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                transition: 'transform 0.2s ease-in-out',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
        >
            <Icon
                iconName="ChevronRight"
                styles={{
                    root: {
                        fontSize: size - 4,
                        lineHeight: `${size}px`,
                        color: '#605e5c',
                        '&:hover': {
                            color: '#201f1e',
                        },
                    },
                }}
            />
        </button>
    );
});

ChevronIcon.displayName = 'ChevronIcon';

/**
 * Hierarchical row wrapper that adds indentation and chevron
 */
export const HierarchicalRow: React.FC<HierarchicalRowProps> = React.memo(({
    node,
    indentSize,
    onToggleExpand,
    children,
    isLoading = false,
    showChevron = true,
}) => {
    const indent = node.level * indentSize;

    const handleChevronClick = React.useCallback(() => {
        if (node.hasChildren) {
            onToggleExpand(node.id);
        }
    }, [node.id, node.hasChildren, onToggleExpand]);

    return (
        <div
            className="hierarchical-row"
            data-node-id={node.id}
            data-level={node.level}
            data-has-children={node.hasChildren}
            data-is-expanded={node.isExpanded}
            style={{
                display: 'flex',
                alignItems: 'stretch',
                width: '100%',
            }}
        >
            {/* Indentation spacer */}
            <div
                className="hierarchy-indent"
                style={{
                    width: indent,
                    flexShrink: 0,
                    position: 'relative',
                }}
            >
                {/* Optional: Add vertical lines for visual hierarchy */}
                {node.level > 0 && (
                    <div
                        className="hierarchy-line"
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: indent,
                            background: `repeating-linear-gradient(
                                to right,
                                transparent,
                                transparent ${indentSize - 1}px,
                                #edebe9 ${indentSize - 1}px,
                                #edebe9 ${indentSize}px
                            )`,
                        }}
                    />
                )}
            </div>

            {/* Chevron icon */}
            {showChevron && (
                <div
                    className="hierarchy-chevron"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 4px',
                        flexShrink: 0,
                    }}
                >
                    <ChevronIcon
                        isExpanded={node.isExpanded}
                        hasChildren={node.hasChildren}
                        isLoading={isLoading}
                        onClick={handleChevronClick}
                    />
                </div>
            )}

            {/* Actual row content */}
            <div
                className="hierarchy-content"
                style={{
                    flex: 1,
                    minWidth: 0, // Allow content to shrink
                }}
            >
                {children}
            </div>
        </div>
    );
});

HierarchicalRow.displayName = 'HierarchicalRow';

/**
 * Hook for managing hierarchical row state
 */
export const useHierarchicalRow = (nodeId: string, hierarchyManager: any) => {
    const [node, setNode] = React.useState<HierarchyNode | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (hierarchyManager) {
            const currentNode = hierarchyManager.getNode(nodeId);
            setNode(currentNode || null);
        }
    }, [nodeId, hierarchyManager]);

    const toggleExpand = React.useCallback(async () => {
        if (!node || !node.hasChildren) return;

        setIsLoading(true);
        try {
            hierarchyManager.toggleExpand(nodeId);
        } finally {
            setIsLoading(false);
        }
    }, [nodeId, node, hierarchyManager]);

    return {
        node,
        isLoading,
        toggleExpand,
    };
};
