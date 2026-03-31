import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class CustomIconService {
    private iconMap: { [key: string]: string } = {
        'home': 'assets/icons/menu/home.svg',
        'leave': 'assets/icons/menu/leave.svg',
        'team': 'assets/icons/menu/team.svg',
        'onboarding': 'assets/icons/menu/onboarding.svg',
        'admin': 'assets/icons/menu/admin.svg',
        'worktrack': 'assets/icons/menu/worktrack.svg',
        'attendance': 'assets/icons/menu/attendance.svg',
        'logout': 'assets/icons/menu/logout.svg'
    };

    constructor() { }

    /**
     * Get the SVG icon path for a given icon name
     */
    getIconPath(iconName: string): string {
        return this.iconMap[iconName] || 'assets/icons/menu/home.svg';
    }

    /**
     * Get all available icons
     */
    getAllIcons(): { [key: string]: string } {
        return { ...this.iconMap };
    }
}
