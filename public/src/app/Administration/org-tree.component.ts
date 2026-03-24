import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { EmployeeService } from '../services/employee.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { forkJoin, Subject, takeUntil, of } from 'rxjs';

@Component({
    selector: 'app-org-tree',
    templateUrl: './org-tree.component.html',
    styleUrls: ['./org-tree.component.scss'],
    standalone: true,
    imports: [IonicModule, CommonModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    animations: [
        trigger('expandCollapse', [
            state('expanded', style({
                maxHeight: '1000px',
                opacity: 1,
                overflow: 'visible',
            })),
            state('collapsed', style({
                maxHeight: '0',
                opacity: 0,
                overflow: 'hidden',
            })),
            transition('expanded <=> collapsed', [
                animate('400ms cubic-bezier(0.4,0,0.2,1)')
            ]),
        ])
    ]
})
export class OrgTreeComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    orgTree: any[] = [];
    loading = false;
    error: string | null = null;
    expanded: { [id: string]: boolean } = {};
    private myEmployeeId: number | null = null;
    parentMap: { [childId: string]: number | null } = {};
    avatarColors = [
        'linear-gradient(135deg, #6366F1, #4F46E5)', // Indigo
        'linear-gradient(135deg, #3B82F6, #2563EB)', // Blue
        'linear-gradient(135deg, #10B981, #059669)', // Green
        'linear-gradient(135deg, #F59E0B, #D97706)', // Amber
        'linear-gradient(135deg, #EF4444, #DC2626)', // Red
        'linear-gradient(135deg, #8B5CF6, #7C3AED)', // Violet
        'linear-gradient(135deg, #EC4899, #DB2777)'  // Pink
    ];
    constructor(private employeeService: EmployeeService) { }

    // Handle expansion with lazy loading
    toggleExpand(node: any) {
        if (!this.expanded[node.id]) {
            // Expanding
            if ((!node.directReports || node.directReports.length === 0)) {
                this.loading = true;
                this.employeeService.getReportingTeamByEmployeeId(node.id).subscribe({
                    next: (res: any) => {
                        console.log(res, 'hi');
                        node.directReports = res.team || [];
                        // Identify team members if node is 'Me' or already 'Manager' path
                        if (node.isMe || node.isManager) {
                            node.directReports.forEach((dr: any) => {
                                if (node.isMe) dr.isTeam = true;
                            });
                        }
                        this.exclusiveExpand(node.id);
                        this.loading = false;
                    },
                    error: (err) => {
                        console.error('Error fetching reporting team:', err);
                        this.loading = false;
                        this.exclusiveExpand(node.id);
                    }
                });
            } else {
                this.exclusiveExpand(node.id);
            }
        } else {
            // Collapsing
            this.expanded[node.id] = false;
        }
    }

    // Collapse all siblings and expand only the selected node
    exclusiveExpand(nodeId: number) {
        // Build parentMap if not present
        if (!this.parentMap || Object.keys(this.parentMap).length === 0) {
            this.parentMap = {};
            const buildParentMap = (nodes: any[], parentId: number | null) => {
                for (const node of nodes) {
                    this.parentMap[node.id] = parentId;
                    if (node.directReports && node.directReports.length > 0) {
                        buildParentMap(node.directReports, node.id);
                    }
                }
            };
            buildParentMap(this.orgTree, null);
        } else {
            // Update parentMap for the expanded node's children
            const node = this.findEmployeeNode(this.orgTree, nodeId);
            if (node && node.directReports) {
                node.directReports.forEach((dr: any) => {
                    this.parentMap[dr.id] = nodeId;
                });
            }
        }

        const parentId = this.parentMap[nodeId];
        let siblings: number[] = [];
        if (parentId === undefined) {
            // Fallback if not found
            this.expanded[nodeId] = !this.expanded[nodeId];
            return;
        }

        if (parentId === null) {
            siblings = Object.keys(this.parentMap)
                .filter(id => this.parentMap[id] === null)
                .map(id => +id);
        } else {
            siblings = Object.keys(this.parentMap)
                .filter(id => this.parentMap[id] === parentId)
                .map(id => +id);
        }
        siblings.forEach(id => {
            if (id !== nodeId) this.expanded[id] = false;
        });
        this.expanded[nodeId] = true;
    }

    // Find a node by employee id in the org tree
    findEmployeeNode(nodes: any[], id: any): any | null {
        if (!id) return null;
        for (const node of nodes) {
            if (node.id == id) return node;
            if (node.directReports && node.directReports.length > 0) {
                const found = this.findEmployeeNode(node.directReports, id);
                if (found) return found;
            }
        }
        return null;
    }

    // Build the full org tree from a flat employee list
    buildOrgTree(employees: any[]): any[] {
        const map: { [id: string]: any } = {};
        const roots: any[] = [];

        // Prepare map and clear directReports
        employees.forEach(emp => {
            if (emp && emp.id) {
                map[emp.id] = { ...emp, directReports: [] };
            }
        });

        employees.forEach(emp => {
            if (!emp || !emp.id) return;
            const managerId = emp.reporting_manager_id || emp.manager_id || emp.reportingTo || emp.reporting_to;
            if (managerId && map[managerId]) {
                map[managerId].directReports.push(map[emp.id]);
            } else {
                roots.push(map[emp.id]);
            }
        });
        return roots;
    }

    // Expand only the logged-in user's team, collapse others
    setInitialExpansion(nodes: any[], myId: number | null) {
        if (!myId) return;
        // Find the node for the logged-in user and expand its path
        const expandPath = (node: any): boolean => {
            if (node.id == myId) {
                this.expanded[node.id] = true;
                return true;
            }
            if (node.directReports && node.directReports.length > 0) {
                for (const dr of node.directReports) {
                    if (expandPath(dr)) {
                        this.expanded[node.id] = true;
                        return true;
                    }
                }
            }
            this.expanded[node.id] = false;
            return false;
        };
        nodes.forEach(root => expandPath(root));
    }

    private flagNodes(myNode: any, managerNode: any) {
        if (myNode) {
            myNode.isMe = true;
            // Identify team members
            if (myNode.directReports) {
                myNode.directReports.forEach((dr: any) => {
                    dr.isTeam = true;
                });
            }
        }
        if (managerNode) {
            managerNode.isManager = true;
            // Identify co-team members
            if (managerNode.directReports) {
                managerNode.directReports.forEach((dr: any) => {
                    if (dr.id !== this.myEmployeeId) {
                        dr.isCoTeam = true;
                    }
                });
            }
        }
    }
    trackById(index: number, item: any) {
        return item.id || index;
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnInit() {
        this.loading = true;
        // Get logged-in employee profile first
        this.employeeService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe({
            next: (me) => {
                console.log('OrgTree: My Profile:', me);
                if (!me || !me.id) {
                    this.error = 'Could not load employee profile.';
                    this.loading = false;
                    return;
                }
                this.myEmployeeId = me.id;

                const managerId = me.reporting_manager_id || me.manager_id || me.reportingTo || me.reporting_to;
                const requests: any = {
                    coTeam: this.employeeService.getMyCoTeam(),
                    reportingTeam: this.employeeService.getMyReportingTeam()
                };
                if (managerId) {
                    requests.manager = this.employeeService.getEmployeeById(managerId);
                }

                forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
                    next: (res: any) => {
                        console.log('OrgTree: Hierarchy:', res);
                        const manager = res.manager;
                        const coTeam = res.coTeam?.team || [];
                        const myTeam = res.reportingTeam?.team || [];

                        // Build 'Me' node
                        const myNode = { ...me, isMe: true, directReports: myTeam };
                        myTeam.forEach((dr: any) => dr.isTeam = true);

                        if (manager) {
                            // If manager exists, he is the root of this local hierarchy
                            const managerNode = { ...manager, isManager: true, directReports: [myNode] };
                            coTeam.forEach((peer: any) => {
                                peer.isCoTeam = true;
                                managerNode.directReports.push(peer);
                            });

                            // Sort reports (Me should be first or co-team sorted)
                            managerNode.directReports.sort((a: any, b: any) => {
                                if (a.isMe) return -1;
                                if (b.isMe) return 1;
                                return (a.FirstName || '').localeCompare(b.FirstName || '');
                            });

                            this.orgTree = [managerNode];
                            this.parentMap = {}; // Reset parent map for exclusive expansion
                            this.parentMap[managerNode.id] = null;
                            managerNode.directReports.forEach((dr: any) => this.parentMap[dr.id] = managerNode.id);
                            myNode.directReports.forEach((dr: any) => this.parentMap[dr.id] = myNode.id);

                            this.expanded = {};
                            this.expanded[managerNode.id] = true;
                            this.expanded[myNode.id] = true;
                        } else {
                            // Employee is root
                            this.orgTree = [myNode];
                            this.parentMap = {};
                            this.parentMap[myNode.id] = null;
                            myNode.directReports.forEach((dr: any) => this.parentMap[dr.id] = myNode.id);

                            this.expanded = {};
                            this.expanded[myNode.id] = true;
                        }
                        this.loading = false;
                    },
                    error: (err) => {
                        console.error('OrgTree: Error fetching hierarchy data:', err);
                        this.error = 'Could not load hierarchy data.';
                        this.loading = false;
                    }
                });
            },
            error: (err) => {
                console.error('OrgTree: Error fetching profile:', err);
                this.error = 'Could not load employee profile.';
                this.loading = false;
            }
        });
    }
    getAvatarColor(emp: any): string {
        const key = emp.id || emp.WorkEmail || emp.FirstName;
        let hash = 0;

        for (let i = 0; i < String(key).length; i++) {
            hash = String(key).charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % this.avatarColors.length;
        return this.avatarColors[index];
    }
}
