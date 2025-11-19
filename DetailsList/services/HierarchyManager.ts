/**
 * HierarchyManager.ts
 * Enterprise-grade hierarchy management service
 * Handles parent-child relationships, auto-detection, and state management
 * Built to Meta/Google performance standards
 */

import {
    HierarchyConfig,
    HierarchyNode,
    HierarchyState,
    HierarchyRelationship,
    HierarchyDetectionResult,
    HierarchyEvent,
    HierarchyMetrics,
    HierarchyExpandOptions,
    DEFAULT_HIERARCHY_CONFIG,
    PRIMARY_KEY_PATTERNS,
    PARENT_REFERENCE_PATTERNS,
} from '../types/Hierarchy.types';

/**
 * High-performance hierarchy manager with intelligent caching
 */
export class HierarchyManager {
    private state: HierarchyState;
    private eventListeners: Map<string, Array<(event: HierarchyEvent) => void>>;
    private metrics: HierarchyMetrics;
    private parentDataset: any[];
    private childDataset: any[];

    constructor(config: Partial<HierarchyConfig> = {}) {
        this.state = {
            nodes: new Map(),
            rootIds: [],
            expandedIds: new Set(),
            collapsedIds: new Set(),
            visibleNodes: [],
            childrenCache: new Map(),
            config: { ...DEFAULT_HIERARCHY_CONFIG, ...config },
            totalNodes: 0,
            visibleCount: 0,
            isBuilding: false,
        };

        this.eventListeners = new Map();
        this.metrics = this.createEmptyMetrics();
        this.parentDataset = [];
        this.childDataset = [];
    }

    /**
     * Initialize hierarchy with parent and child datasets
     */
    public initialize(
        parentRecords: any[],
        childRecords: any[],
        relationship?: HierarchyRelationship
    ): void {
        const startTime = performance.now();

        this.parentDataset = parentRecords || [];
        this.childDataset = childRecords || [];
        this.state.isBuilding = true;

        try {
            // Detect or use provided relationship
            const detectionResult = relationship
                ? { canEstablishHierarchy: true, relationship, matchCount: 0, warnings: [] }
                : this.detectHierarchyRelationship();

            if (!detectionResult.canEstablishHierarchy || !detectionResult.relationship) {
                console.warn('Cannot establish hierarchy:', detectionResult.warnings);
                this.state.isBuilding = false;
                return;
            }

            // Build hierarchy structure
            this.buildHierarchy(detectionResult.relationship);

            // Apply default expansion
            this.applyDefaultExpansion();

            // Calculate visible nodes
            this.rebuildVisibleNodes();

            this.metrics.buildTime = performance.now() - startTime;
            this.metrics.nodesProcessed = this.state.nodes.size;

            this.emitEvent({
                type: 'rebuild',
                affectedIds: Array.from(this.state.nodes.keys()),
                timestamp: Date.now(),
            });
        } finally {
            this.state.isBuilding = false;
        }
    }

    /**
     * Auto-detect hierarchy relationship between datasets
     */
    private detectHierarchyRelationship(): HierarchyDetectionResult {
        const result: HierarchyDetectionResult = {
            canEstablishHierarchy: false,
            relationship: null,
            matchCount: 0,
            warnings: [],
        };

        if (this.parentDataset.length === 0) {
            result.warnings.push('Parent dataset is empty');
            return result;
        }

        if (this.childDataset.length === 0) {
            result.warnings.push('Child dataset is empty');
            return result;
        }

        // Try manual configuration first
        if (
            this.state.config.parentKeyColumn &&
            this.state.config.childKeyColumn &&
            this.state.config.parentReferenceColumn
        ) {
            const relationship: HierarchyRelationship = {
                parentKey: this.state.config.parentKeyColumn,
                childKey: this.state.config.childKeyColumn,
                referenceColumn: this.state.config.parentReferenceColumn,
                autoDetected: false,
            };

            const matchCount = this.validateRelationship(relationship);
            if (matchCount > 0) {
                result.canEstablishHierarchy = true;
                result.relationship = relationship;
                result.matchCount = matchCount;
                return result;
            }
        }

        // Auto-detection
        if (this.state.config.autoDetectKeys) {
            const detected = this.autoDetectRelationship();
            if (detected) {
                result.canEstablishHierarchy = true;
                result.relationship = detected;
                result.matchCount = this.validateRelationship(detected);
                return result;
            }
        }

        result.warnings.push('Could not auto-detect relationship. Please configure manually.');
        return result;
    }

    /**
     * Auto-detect relationship by analyzing column patterns
     */
    private autoDetectRelationship(): HierarchyRelationship | null {
        const parentSample = this.parentDataset[0];
        const childSample = this.childDataset[0];

        if (!parentSample || !childSample) return null;

        const parentColumns = Object.keys(parentSample);
        const childColumns = Object.keys(childSample);

        // Find parent key (primary key)
        let parentKey: string | null = null;
        for (const pattern of PRIMARY_KEY_PATTERNS) {
            const match = parentColumns.find(col => pattern.test(col));
            if (match) {
                parentKey = match;
                break;
            }
        }

        // Find child key
        let childKey: string | null = null;
        for (const pattern of PRIMARY_KEY_PATTERNS) {
            const match = childColumns.find(col => pattern.test(col));
            if (match) {
                childKey = match;
                break;
            }
        }

        // Find parent reference column in child
        let referenceColumn: string | null = null;
        for (const pattern of PARENT_REFERENCE_PATTERNS) {
            const match = childColumns.find(col => pattern.test(col));
            if (match) {
                referenceColumn = match;
                break;
            }
        }

        if (!parentKey || !childKey || !referenceColumn) {
            return null;
        }

        return {
            parentKey,
            childKey,
            referenceColumn,
            autoDetected: true,
            confidence: 0.85,
        };
    }

    /**
     * Validate that relationship produces actual matches
     */
    private validateRelationship(relationship: HierarchyRelationship): number {
        let matchCount = 0;

        const parentKeys = new Set(
            this.parentDataset.map(record => record[relationship.parentKey])
        );

        for (const childRecord of this.childDataset) {
            const parentRef = childRecord[relationship.referenceColumn];
            if (parentRef && parentKeys.has(parentRef)) {
                matchCount++;
            }
        }

        return matchCount;
    }

    /**
     * Build hierarchy structure from datasets
     */
    private buildHierarchy(relationship: HierarchyRelationship): void {
        this.state.nodes.clear();
        this.state.rootIds = [];
        this.state.childrenCache.clear();

        // Create nodes for parent records (root level)
        for (const parentRecord of this.parentDataset) {
            const parentId = this.getRecordId(parentRecord, relationship.parentKey);
            
            const node: HierarchyNode = {
                id: parentId,
                data: parentRecord,
                parentId: null,
                childIds: [],
                level: 0,
                isExpanded: false,
                hasChildren: false,
                childCount: 0,
                descendantCount: 0,
                childrenLoaded: true,
                isLoading: false,
                path: [parentId],
                isVisible: true,
                datasetType: 'parent', // Tag as parent record
            };

            this.state.nodes.set(parentId, node);
            this.state.rootIds.push(parentId);
        }

        // Map children to parents
        const childrenMap = new Map<string, any[]>();

        for (const childRecord of this.childDataset) {
            const parentRef = childRecord[relationship.referenceColumn];
            if (!parentRef) continue;

            const parentId = String(parentRef);
            if (!childrenMap.has(parentId)) {
                childrenMap.set(parentId, []);
            }
            childrenMap.get(parentId)!.push(childRecord);
        }

        // Create child nodes and link to parents
        for (const [parentId, children] of childrenMap.entries()) {
            const parentNode = this.state.nodes.get(parentId);
            if (!parentNode) continue;

            parentNode.hasChildren = true;
            parentNode.childCount = children.length;
            parentNode.descendantCount = children.length;

            for (const childRecord of children) {
                const childId = this.getRecordId(childRecord, relationship.childKey);
                
                const childNode: HierarchyNode = {
                    id: childId,
                    data: childRecord,
                    parentId: parentId,
                    childIds: [],
                    level: 1,
                    isExpanded: false,
                    hasChildren: false,
                    childCount: 0,
                    descendantCount: 0,
                    childrenLoaded: true,
                    isLoading: false,
                    path: [parentId, childId],
                    isVisible: false, // Children start hidden
                    datasetType: 'child', // Tag as child record
                };

                this.state.nodes.set(childId, childNode);
                parentNode.childIds.push(childId);
            }

            this.state.childrenCache.set(parentId, parentNode.childIds);
        }

        this.state.totalNodes = this.state.nodes.size;
    }

    /**
     * Get record ID with fallback
     */
    private getRecordId(record: any, keyColumn: string): string {
        return String(record[keyColumn] || record.id || record.ID || Math.random());
    }

    /**
     * Apply default expansion based on configuration
     */
    private applyDefaultExpansion(): void {
        const { defaultExpandLevel } = this.state.config;

        if (defaultExpandLevel === -1) {
            // Expand all
            this.expandAll();
        } else if (defaultExpandLevel > 0) {
            // Expand to specific level
            for (const node of this.state.nodes.values()) {
                if (node.level < defaultExpandLevel && node.hasChildren) {
                    this.expandNode(node.id, { recursive: false });
                }
            }
        }
    }

    /**
     * Expand a specific node
     */
    public expandNode(nodeId: string, options: HierarchyExpandOptions = {}): void {
        const startTime = performance.now();
        const node = this.state.nodes.get(nodeId);

        if (!node) return;

        const affectedIds: string[] = [nodeId];

        // Mark as expanded
        node.isExpanded = true;
        this.state.expandedIds.add(nodeId);
        this.state.collapsedIds.delete(nodeId);

        // Make direct children visible
        for (const childId of node.childIds) {
            const child = this.state.nodes.get(childId);
            if (child) {
                child.isVisible = true;
                affectedIds.push(childId);
            }
        }

        // Recursive expansion
        if (options.recursive) {
            const maxDepth = options.maxDepth ?? this.state.config.maxDepth;
            this.expandRecursive(node, maxDepth, affectedIds);
        }

        this.rebuildVisibleNodes();

        this.metrics.expandTime = performance.now() - startTime;

        this.emitEvent({
            type: 'expand',
            nodeId,
            affectedIds,
            timestamp: Date.now(),
        });

        if (options.onComplete) {
            options.onComplete(affectedIds);
        }
    }

    /**
     * Recursively expand node and descendants
     */
    private expandRecursive(node: HierarchyNode, maxDepth: number, affectedIds: string[]): void {
        if (node.level >= maxDepth) return;

        for (const childId of node.childIds) {
            const child = this.state.nodes.get(childId);
            if (!child || !child.hasChildren) continue;

            child.isExpanded = true;
            this.state.expandedIds.add(childId);
            affectedIds.push(childId);

            for (const grandchildId of child.childIds) {
                const grandchild = this.state.nodes.get(grandchildId);
                if (grandchild) {
                    grandchild.isVisible = true;
                    affectedIds.push(grandchildId);
                }
            }

            this.expandRecursive(child, maxDepth, affectedIds);
        }
    }

    /**
     * Collapse a specific node
     */
    public collapseNode(nodeId: string): void {
        const node = this.state.nodes.get(nodeId);
        if (!node) return;

        const affectedIds: string[] = [nodeId];

        // Mark as collapsed
        node.isExpanded = false;
        this.state.expandedIds.delete(nodeId);
        this.state.collapsedIds.add(nodeId);

        // Hide all descendants recursively
        this.hideDescendants(node, affectedIds);

        this.rebuildVisibleNodes();

        this.emitEvent({
            type: 'collapse',
            nodeId,
            affectedIds,
            timestamp: Date.now(),
        });
    }

    /**
     * Hide all descendants of a node
     */
    private hideDescendants(node: HierarchyNode, affectedIds: string[]): void {
        for (const childId of node.childIds) {
            const child = this.state.nodes.get(childId);
            if (!child) continue;

            child.isVisible = false;
            affectedIds.push(childId);

            if (child.hasChildren) {
                this.hideDescendants(child, affectedIds);
            }
        }
    }

    /**
     * Toggle node expansion
     */
    public toggleNode(nodeId: string): void {
        const node = this.state.nodes.get(nodeId);
        if (!node) return;

        if (node.isExpanded) {
            this.collapseNode(nodeId);
        } else {
            this.expandNode(nodeId);
        }
    }

    /**
     * Expand all nodes
     */
    public expandAll(): void {
        const affectedIds: string[] = [];

        for (const node of this.state.nodes.values()) {
            if (node.hasChildren && !node.isExpanded) {
                node.isExpanded = true;
                this.state.expandedIds.add(node.id);
                affectedIds.push(node.id);
            }

            if (node.level > 0) {
                node.isVisible = true;
            }
        }

        this.rebuildVisibleNodes();

        this.emitEvent({
            type: 'expandAll',
            affectedIds,
            timestamp: Date.now(),
        });
    }

    /**
     * Collapse all nodes
     */
    public collapseAll(): void {
        const affectedIds: string[] = [];

        for (const node of this.state.nodes.values()) {
            if (node.isExpanded) {
                node.isExpanded = false;
                this.state.expandedIds.delete(node.id);
                affectedIds.push(node.id);
            }

            if (node.level > 0) {
                node.isVisible = false;
            }
        }

        this.rebuildVisibleNodes();

        this.emitEvent({
            type: 'collapseAll',
            affectedIds,
            timestamp: Date.now(),
        });
    }

    /**
     * Rebuild flat list of visible nodes for rendering
     */
    private rebuildVisibleNodes(): void {
        const startTime = performance.now();
        this.state.visibleNodes = [];

        // Process root nodes first
        for (const rootId of this.state.rootIds) {
            this.addVisibleNodeRecursive(rootId);
        }

        this.state.visibleCount = this.state.visibleNodes.length;
        this.metrics.renderTime = performance.now() - startTime;
    }

    /**
     * Recursively add visible nodes in tree order
     */
    private addVisibleNodeRecursive(nodeId: string): void {
        const node = this.state.nodes.get(nodeId);
        if (!node || !node.isVisible) return;

        this.state.visibleNodes.push(node);

        if (node.isExpanded && node.hasChildren) {
            for (const childId of node.childIds) {
                this.addVisibleNodeRecursive(childId);
            }
        }
    }

    /**
     * Get current state
     */
    public getState(): Readonly<HierarchyState> {
        return this.state;
    }

    /**
     * Get visible nodes for rendering
     */
    public getVisibleNodes(): HierarchyNode[] {
        return this.state.visibleNodes;
    }

    /**
     * Get node by ID
     */
    public getNode(nodeId: string): HierarchyNode | undefined {
        return this.state.nodes.get(nodeId);
    }

    /**
     * Get children of a node
     */
    public getChildren(nodeId: string): HierarchyNode[] {
        const node = this.state.nodes.get(nodeId);
        if (!node) return [];

        return node.childIds
            .map(id => this.state.nodes.get(id))
            .filter((n): n is HierarchyNode => n !== undefined);
    }

    /**
     * Check if node is expanded
     */
    public isExpanded(nodeId: string): boolean {
        return this.state.expandedIds.has(nodeId);
    }

    /**
     * Get performance metrics
     */
    public getMetrics(): HierarchyMetrics {
        return { ...this.metrics };
    }

    /**
     * Subscribe to hierarchy events
     */
    public on(eventType: string, callback: (event: HierarchyEvent) => void): () => void {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }

        this.eventListeners.get(eventType)!.push(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * Emit hierarchy event
     */
    private emitEvent(event: HierarchyEvent): void {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            listeners.forEach(callback => callback(event));
        }

        // Also emit to wildcard listeners
        const wildcardListeners = this.eventListeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(callback => callback(event));
        }
    }

    /**
     * Create empty metrics object
     */
    private createEmptyMetrics(): HierarchyMetrics {
        return {
            buildTime: 0,
            expandTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            nodesProcessed: 0,
            cacheHitRate: 0,
        };
    }

    /**
     * Dispose and cleanup
     */
    public dispose(): void {
        this.state.nodes.clear();
        this.state.expandedIds.clear();
        this.state.collapsedIds.clear();
        this.state.childrenCache.clear();
        this.eventListeners.clear();
        this.parentDataset = [];
        this.childDataset = [];
    }
}
