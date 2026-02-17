import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
    const options = {
        maxSizeMB: 0.8, // Target size ~800KB (relaxed from 300KB to ensure quality)
        maxWidthOrHeight: 1280, // HD Ready resolution
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.7
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
    } catch (error) {
        console.error('Image compression failed:', error);
        return file; // Fallback to original if compression fails
    }
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return await res.blob();
};
