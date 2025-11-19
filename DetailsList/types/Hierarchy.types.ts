/**
 * Hierarchy.types.ts
 * Enterprise-grade type definitions for hierarchical data structures
 * Designed for Meta/Google-level performance and scalability
 */

/**
 * Configuration for hierarchy behavior
 */
export interface HierarchyConfig {
    /** Enable hierarchical view */
    enabled: boolean;
    
    /** Column name containing the parent record's primary key */
    parentKeyColumn?: string;
    
    /** Column name containing the child record's primary key */
    childKeyColumn?: string;
    
    /** Column name in child records that references the parent */
    parentReferenceColumn?: string;
    
    /** Auto-detect primary key columns (looks for common patterns like 'id', 'ID', etc.) */
    autoDetectKeys: boolean;
    
    /** Default expansion level (0 = collapsed, 1 = first level, -1 = all) */
    defaultExpandLevel: number;
    
    /** Indentation size in pixels per level */
    indentSize: number;
    
    /** Show expand/collapse all button */
    showExpandCollapseAll: boolean;
    
    /** Cache child records for performance */
    enableCaching: boolean;
    
    /** Maximum depth to prevent infinite recursion */
    maxDepth: number;
    
    /** Lazy load children on expand (vs preload all) */
    lazyLoadChildren: boolean;
}

/**
 * Represents a hierarchical node in the tree
 */
export interface HierarchyNode<T = any> {
    /** Unique identifier for this node */
    id: string;
    
    /** Reference to the actual data record */
    data: T;
    
    /** Parent node ID (null for root nodes) */
    parentId: string | null;
    
    /** Array of child node IDs */
    childIds: string[];
    
    /** Depth level in the hierarchy (0 for root) */
    level: number;
    
    /** Whether this node is expanded */
    isExpanded: boolean;
    
    /** Whether this node has children */
    hasChildren: boolean;
    
    /** Number of direct children */
    childCount: number;
    
    /** Total descendants (including nested children) */
    descendantCount: number;
    
    /** Whether children have been loaded */
    childrenLoaded: boolean;
    
    /** Whether node is currently loading children */
    isLoading: boolean;
    
    /** Path from root to this node (array of IDs) */
    path: string[];
    
    /** Whether this node is visible (based on parent expansion state) */
    isVisible: boolean;
    
    /** Source dataset type: 'parent' or 'child' */
    datasetType?: 'parent' | 'child';
}

/**
 * Hierarchy state management
 */
export interface HierarchyState {
    /** Map of all nodes by ID */
    nodes: Map<string, HierarchyNode>;
    
    /** Root node IDs (nodes without parents) */
    rootIds: string[];
    
    /** Currently expanded node IDs */
    expandedIds: Set<string>;
    
    /** Collapsed node IDs (for tracking user actions) */
    collapsedIds: Set<string>;
    
    /** Flat list of visible nodes (for rendering) */
    visibleNodes: HierarchyNode[];
    
    /** Cache of parent-to-children mappings */
    childrenCache: Map<string, string[]>;
    
    /** Configuration */
    config: HierarchyConfig;
    
    /** Total number of nodes */
    totalNodes: number;
    
    /** Total visible nodes */
    visibleCount: number;
    
    /** Whether hierarchy is currently being built/rebuilt */
    isBuilding: boolean;
}

/**
 * Relationship mapping between parent and child records
 */
export interface HierarchyRelationship {
    /** Parent dataset key column */
    parentKey: string;
    
    /** Child dataset key column */
    childKey: string;
    
    /** Reference column in child that points to parent */
    referenceColumn: string;
    
    /** Whether the relationship was auto-detected */
    autoDetected: boolean;
    
    /** Confidence score for auto-detection (0-1) */
    confidence?: number;
}

/**
 * Result of hierarchy detection
 */
export interface HierarchyDetectionResult {
    /** Whether hierarchy can be established */
    canEstablishHierarchy: boolean;
    
    /** Detected or configured relationship */
    relationship: HierarchyRelationship | null;
    
    /** Potential parent-child matches found */
    matchCount: number;
    
    /** Any warnings or issues */
    warnings: string[];
    
    /** Suggested configuration if auto-detected */
    suggestedConfig?: Partial<HierarchyConfig>;
}

/**
 * Event emitted when hierarchy state changes
 */
export interface HierarchyEvent {
    /** Event type */
    type: 'expand' | 'collapse' | 'expandAll' | 'collapseAll' | 'load' | 'rebuild';
    
    /** Node ID that triggered the event */
    nodeId?: string;
    
    /** Affected node IDs */
    affectedIds: string[];
    
    /** Timestamp */
    timestamp: number;
    
    /** Additional metadata */
    metadata?: any;
}

/**
 * Performance metrics for hierarchy operations
 */
export interface HierarchyMetrics {
    /** Time to build hierarchy (ms) */
    buildTime: number;
    
    /** Time to expand node (ms) */
    expandTime: number;
    
    /** Time to render visible nodes (ms) */
    renderTime: number;
    
    /** Memory usage estimate (bytes) */
    memoryUsage: number;
    
    /** Number of nodes processed */
    nodesProcessed: number;
    
    /** Cache hit rate (0-1) */
    cacheHitRate: number;
}

/**
 * Options for expanding/collapsing nodes
 */
export interface HierarchyExpandOptions {
    /** Expand recursively to all descendants */
    recursive?: boolean;
    
    /** Maximum depth to expand */
    maxDepth?: number;
    
    /** Callback when expansion is complete */
    onComplete?: (nodeIds: string[]) => void;
    
    /** Whether to animate the expansion */
    animated?: boolean;
}

/**
 * Filter that respects hierarchy structure
 */
export interface HierarchyFilter {
    /** Show all ancestors of matching nodes */
    showAncestors: boolean;
    
    /** Show all descendants of matching nodes */
    showDescendants: boolean;
    
    /** Highlight matching nodes */
    highlightMatches: boolean;
    
    /** Auto-expand to show matches */
    autoExpandMatches: boolean;
}

/**
 * Props for hierarchical row rendering
 */
export interface HierarchicalRowProps {
    /** The hierarchy node */
    node: HierarchyNode;
    
    /** Whether to show chevron */
    showChevron: boolean;
    
    /** Indentation level */
    indentLevel: number;
    
    /** Indent size in pixels */
    indentSize: number;
    
    /** Whether row is expanded */
    isExpanded: boolean;
    
    /** Whether row has children */
    hasChildren: boolean;
    
    /** Callback when chevron is clicked */
    onToggleExpand: (nodeId: string) => void;
    
    /** Whether row is loading children */
    isLoading?: boolean;
    
    /** Custom chevron renderer */
    renderChevron?: (props: ChevronProps) => React.ReactNode;
    
    /** Custom indentation renderer */
    renderIndent?: (level: number, size: number) => React.ReactNode;
}

/**
 * Props for chevron icon component
 */
export interface ChevronProps {
    /** Whether expanded */
    isExpanded: boolean;
    
    /** Whether node has children */
    hasChildren: boolean;
    
    /** Whether children are loading */
    isLoading: boolean;
    
    /** Click handler */
    onClick: () => void;
    
    /** Size in pixels */
    size?: number;
    
    /** Custom icon name */
    iconName?: string;
    
    /** Animation duration (ms) */
    animationDuration?: number;
    
    /** Custom styles */
    styles?: React.CSSProperties;
}

/**
 * Default hierarchy configuration
 */
export const DEFAULT_HIERARCHY_CONFIG: HierarchyConfig = {
    enabled: false,
    autoDetectKeys: true,
    defaultExpandLevel: 0,
    indentSize: 20,
    showExpandCollapseAll: true,
    enableCaching: true,
    maxDepth: 10,
    lazyLoadChildren: false,
};

/**
 * Common primary key column patterns for auto-detection
 */
export const PRIMARY_KEY_PATTERNS = [
    /^id$/i,
    /^.*id$/i,
    /^key$/i,
    /^.*key$/i,
    /^pk$/i,
    /^primary.*key$/i,
    /^guid$/i,
    /^uuid$/i,
];

/**
 * Common parent reference column patterns
 */
export const PARENT_REFERENCE_PATTERNS = [
    /^parent.*id$/i,
    /^parentkey$/i,
    /^parent$/i,
    /^.*parent.*$/i,
    /^related.*id$/i,
];
