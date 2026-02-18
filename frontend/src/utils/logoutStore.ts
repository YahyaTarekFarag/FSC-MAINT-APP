type LogoutListener = () => void;

class LogoutStore {
    private listeners: Set<LogoutListener> = new Set();

    subscribe(listener: LogoutListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyLogout() {
        this.listeners.forEach(listener => listener());
    }
}

export const logoutStore = new LogoutStore();
