import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class ToasterService {
    constructor(private toastController: ToastController) { }

    /**
     * Show success toast message
     */
    async showSuccess(message: string, duration: number = 2000): Promise<any> {
        const toast = await this.toastController.create({
            message,
            duration,
            position: 'bottom',
            color: 'success',
            buttons: [
                {
                    text: 'Close',
                    role: 'cancel',
                }
            ]
        });
        await toast.present();
        return toast;
    }

    /**
     * Show error toast message
     */
    async showError(message: string, duration: number = 2000): Promise<any> {
        const toast = await this.toastController.create({
            message,
            duration,
            position: 'bottom',
            color: 'danger',
            buttons: [
                {
                    text: 'Close',
                    role: 'cancel',
                }
            ]
        });
        await toast.present();
        return toast;
    }

    /**
     * Show warning toast message
     */
    async showWarning(message: string, duration: number = 2000): Promise<any> {
        const toast = await this.toastController.create({
            message,
            duration,
            position: 'bottom',
            color: 'warning',
            buttons: [
                {
                    text: 'Close',
                    role: 'cancel',
                }
            ]
        });
        await toast.present();
        return toast;
    }

    /**
     * Show info toast message
     */
    async showInfo(message: string, duration: number = 2000): Promise<any> {
        const toast = await this.toastController.create({
            message,
            duration,
            position: 'bottom',
            color: 'primary',
            buttons: [
                {
                    text: 'Close',
                    role: 'cancel',
                }
            ]
        });
        await toast.present();
        return toast;
    }
}
