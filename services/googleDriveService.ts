// Fix: Add google and gapi type declarations to fix TypeScript errors.
// Fix: Combined `declare namespace google` and `declare global` into a single `declare global` block.
// This makes the `google` namespace available globally, resolving TypeScript errors in other files.
declare global {
    namespace google {
        namespace accounts {
            namespace oauth2 {
                interface TokenResponse {
                    access_token: string;
                    error?: string;
                    error_description?: string;
                }
                interface TokenClient {
                    requestAccessToken: () => void;
                }
                interface TokenClientConfig {
                     client_id: string;
                    scope: string;
                    callback: (tokenResponse: TokenResponse) => void;
                    login_hint?: string;
                }
                function initTokenClient(config: TokenClientConfig): TokenClient;
                function revoke(token: string, callback: () => void): void;
            }
        }
        namespace picker {
            class View {
                constructor(viewId: string);
                setMimeTypes(mimeType: string): void;
            }
            const ViewId: {
                FOLDERS: string;
            };
            class PickerBuilder {
                addView(view: View): PickerBuilder;
                setOAuthToken(token: string): PickerBuilder;
                setDeveloperKey(key?: string): PickerBuilder;
                setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
                build(): Picker;
            }
            interface Picker {
                setVisible(visible: boolean): void;
            }
            interface ResponseObject {
                [key: string]: any;
            }
            const Response: {
                ACTION: string;
                DOCUMENTS: string;
            };
            const Action: {
                PICKED: string;
                CANCEL: string;
            };
        }
    }

    interface Window {
        gapiLoaded?: boolean;
        gapi: {
            load: (libs: string, callback: () => void) => void;
            client: {
                load: (discoveryDoc: string) => Promise<void>;
                setToken: (token: { access_token: string; }) => void;
                drive: {
                    files: {
                        create(args: {
                            resource: any;
                            media: {
                                mimeType: string;
                                body: string;
                            };
                            fields: string;
                        }): Promise<{
                            status: number;
                            result: any;
                        }>;
                    };
                };
            };
        };
    }
}


// Fix: Moved GDrive interfaces to this file to be co-located with the service logic.
export interface GDriveFolder {
    id: string;
    name: string;
}

export interface GDriveUser {
    name: string;
    email: string;
    picture: string;
}

export interface GDriveSettings {
    clientId: string;
    loginHint?: string; // Optional email to suggest to Google
    folder: GDriveFolder | null;
    user: GDriveUser | null;
    token: google.accounts.oauth2.TokenResponse | null;
}

// This service handles all interactions with the Google Drive API.
// It uses the new Google Identity Services (GIS) for authentication and gapi for API calls.

const DRIVE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined; // Recommended to use a dedicated API key.
const DRIVE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;

// Waits for the GAPI script to load and initializes it.
const loadGapi = () => new Promise<void>((resolve, reject) => {
    if (gapiInited) {
        resolve();
        return;
    }
    
    const MAX_ATTEMPTS = 100; // 10 seconds maximum wait time (100 * 100ms)
    let attempts = 0;
    
    const interval = setInterval(() => {
        attempts++;
        
        if (window.gapiLoaded) {
            clearInterval(interval);
            window.gapi.load('client:picker', () => {
                window.gapi.client.load(DRIVE_DISCOVERY_DOC)
                    .then(() => {
                        gapiInited = true;
                        resolve();
                    })
                    .catch(reject);
            });
        } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(interval);
            reject(new Error('GAPI script failed to load within the timeout period.'));
        }
    }, 100);
});

// Initializes the GIS token client.
export const initTokenClient = (
    clientId: string,
    callback: (tokenResponse: google.accounts.oauth2.TokenResponse) => void,
    loginHint?: string
) => {
    if (!clientId) {
        console.error("Google Drive: Client ID is missing.");
        return;
    }
    try {
        const config: google.accounts.oauth2.TokenClientConfig = {
            client_id: clientId,
            scope: DRIVE_SCOPES,
            callback: callback,
        };

        if (loginHint) {
            config.login_hint = loginHint;
        }

        tokenClient = google.accounts.oauth2.initTokenClient(config);
    } catch (error) {
        console.error("Error initializing Google Token Client:", error);
    }
};


// Prompts the user to grant access.
export const requestToken = () => {
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        console.error("Token client not initialized.");
    }
};

// Revokes the user's consent.
export const revokeToken = (token: string | null) => {
    if (token) {
        google.accounts.oauth2.revoke(token, () => {
            console.log('Google Drive token revoked.');
        });
    }
};

// Fetches the user's profile information.
export const getUserProfile = async (token: string) => {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error('Failed to fetch user profile.');
    }
    const profile = await response.json();
    return {
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
    };
};

// Creates and displays the Google Picker for folder selection.
export const showFolderPicker = async (token: string): Promise<{id: string, name: string}> => {
    await loadGapi();

    return new Promise((resolve, reject) => {
        const view = new google.picker.View(google.picker.ViewId.FOLDERS);
        view.setMimeTypes("application/vnd.google-apps.folder");

        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(token)
            .setDeveloperKey(DRIVE_API_KEY)
            .setCallback((data: google.picker.ResponseObject) => {
                 if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                    const doc = data[google.picker.Response.DOCUMENTS][0];
                    const folder = { id: doc.id, name: doc.name };
                    resolve(folder);
                } else if (data[google.picker.Response.ACTION] == google.picker.Action.CANCEL) {
                    reject(new Error('Folder selection was cancelled.'));
                }
            })
            .build();
        picker.setVisible(true);
    });
};

// Uploads a text file to a specified folder in Google Drive.
export const uploadFile = async (token: string, folderId: string, fileName: string, content: string) => {
    await loadGapi();
    
    await window.gapi.client.setToken({ access_token: token });

    const metadata = {
        name: fileName,
        mimeType: 'text/plain',
        parents: [folderId]
    };

    const response = await window.gapi.client.drive.files.create({
        resource: metadata,
        media: {
            mimeType: 'text/plain',
            body: content
        },
        fields: 'id'
    });
    
    if (response.status !== 200) {
        throw new Error(`Google Drive API error: ${response.result.error.message}`);
    }
    
    return response.result;
};