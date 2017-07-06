import { animate, style, transition, trigger } from '@angular/animations'
import { Component, HostBinding, Input, OnChanges, OnDestroy, OnInit } from '@angular/core'
import { Subscription } from 'rxjs/Subscription'
import { TreeNode } from '../../models/tree-node'
import { TreeVirtualScroll } from '../../services/tree-virtual-scroll.service'

/** Time and timing curve for expansion panel animations. */
export const EXPANSION_PANEL_ANIMATION_TIMING = '225ms cubic-bezier(0.4,0.0,0.2,1)'

@Component({
    moduleId: module.id,
    selector: 'ngx-tree-node-children',
    templateUrl: './tree-node-children.component.html',
    styleUrls: ['./tree-node-children.component.scss'],
    /*animations: [
        trigger('expandAnimation', [
            transition(':enter', [
                style({ height: 0, overflow: 'hidden' }),
                animate(EXPANSION_PANEL_ANIMATION_TIMING, style({ height: '*' })),
            ]),
            transition(':leave', [
                style({ height: '*', overflow: 'hidden' }),
                animate(EXPANSION_PANEL_ANIMATION_TIMING, style({ height: 0 })),
            ]),
        ]),
    ],*/
})
export class TreeNodeChildrenComponent implements OnInit, OnDestroy, OnChanges {
    @Input() node: TreeNode
    @Input() templates: any

    @HostBinding('class.class.tree-children-no-padding')
    get noPadding() {
        return this.node.options.levelPadding
    }

    /*@HostBinding('@expandAnimation')
    expandAnimation = true*/

    @HostBinding('style.margin-top.px')
    marginTop = 0

    get nodes() {
        return this.node.children
    }

    viewportNodes: TreeNode[] = []
    scrollSub: Subscription

    constructor(private virtualScroll: TreeVirtualScroll) {
    }

    ngOnInit() {
        this.scrollSub = this.virtualScroll.waitForCollection((metrics) => {
            if (this.node.isExpanded || this.node.isRoot) {
                this.viewportNodes = this.getViewportNodes(this.nodes, metrics)
                this.marginTop = this.calcMarginTop()
                // console.log(this.node.id, 'marginTop:', this.marginTop)
            }
        })
    }

    ngOnChanges(changes) {
        if ('node' in changes && this.node) {
            this.viewportNodes = this.nodes
        }
    }

    ngOnDestroy() {
        this.scrollSub.unsubscribe()
    }

    trackNode(index, node) {
        return node.id
    }

    calcMarginTop() {
        const firstNode = this.viewportNodes && this.viewportNodes.length && this.viewportNodes[0]

        return firstNode
            ? Math.max(0, firstNode.position - firstNode.parent.position -
                (firstNode.parent.isRoot ? 0 : this.virtualScroll.averageNodeHeight))
            : 0
    }

    getViewportNodes(nodes: TreeNode[], { startPos, endPos, avgHeight }) {
        if (!nodes) {
            return []
        }

        // Search for first node in the viewport using binary search
        // Look for first node that starts after the beginning of the viewport (with buffer)
        // Or that ends after the beginning of the viewport
        const firstIndex = binarySearch(nodes, (node) => {
            return startPos <= node.position || (startPos <= node.position + node.height)
        })

        // Search for last node in the viewport using binary search
        // Look for first node that starts after the end of the viewport (with buffer)
        const lastIndex = binarySearch(nodes, (node) => {
            return endPos < node.position || (endPos <= node.position + node.height)
        }, firstIndex)

        const viewportNodes = nodes.slice(firstIndex, lastIndex + 1)

        // console.log(this.node.id, 'first: ', firstIndex, 'last: ', lastIndex, viewportNodes)

        return viewportNodes
    }
}

function binarySearch<T>(nodes: T[], condition: (item: T) => boolean, firstIndex = 0) {
    let left = firstIndex
    let right = nodes.length - 1

    while (left !== right) {
        const mid = Math.floor((left + right) / 2)

        if (condition(nodes[mid])) {
            right = mid
        } else {
            if (left === mid) {
                left = right
            } else {
                left = mid
            }
        }
    }

    return left
}
