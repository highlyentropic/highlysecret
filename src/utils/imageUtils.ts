// Image utility functions for todo items
// Uses Node.js fs and path modules (available via nodeIntegration)

declare const require: any;
declare const window: any;
declare const process: any;

const fs = require('fs');
const path = require('path');

// Get Electron APIs - with nodeIntegration: true and contextIsolation: false, we can access directly
function getElectronApp(): any {
  try {
    // With nodeIntegration: true, require should be available globally
    if (typeof require !== 'undefined') {
      const electron = require('electron');
      // In newer Electron versions, remote is deprecated, but app and dialog are available directly
      return electron.app;
    }
    // Fallback for window context
    if (typeof window !== 'undefined' && (window as any).require) {
      const electron = (window as any).require('electron');
      return electron.app || electron.remote?.app;
    }
    return null;
  } catch (error) {
    console.error('Error accessing Electron app:', error);
    return null;
  }
}

function getElectronDialog(): any {
  try {
    // With nodeIntegration: true, require should be available globally
    if (typeof require !== 'undefined') {
      const electron = require('electron');
      // dialog needs to be accessed from the main process via IPC or remote
      // Since we have nodeIntegration: true, we can use remote if available
      if (electron.remote && electron.remote.dialog) {
        return electron.remote.dialog;
      }
      // Try direct access (won't work in renderer, but worth trying)
      if (electron.dialog) {
        return electron.dialog;
      }
    }
    // Fallback for window context
    if (typeof window !== 'undefined' && (window as any).require) {
      const electron = (window as any).require('electron');
      return electron.remote?.dialog || electron.dialog;
    }
    return null;
  } catch (error) {
    console.error('Error accessing Electron dialog:', error);
    return null;
  }
}

// Get the app data directory for storing images
function getImageStorageDir(): string {
  try {
    const app = getElectronApp();
    // Try to use Electron's app.getPath if available
    if (app && app.getPath) {
      const userDataPath = app.getPath('userData');
      const imageDir = path.join(userDataPath, 'todo-images');
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }
      return imageDir;
    }
    // Fallback: use a local directory
    let cwd = '.';
    try {
      // @ts-ignore - process is available in Electron with nodeIntegration
      if (typeof process !== 'undefined' && process.cwd) {
        // @ts-ignore
        cwd = process.cwd();
      }
    } catch (e) {
      // Ignore
    }
    const imageDir = path.join(cwd, 'todo-images');
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    return imageDir;
  } catch (error) {
    console.error('Error getting image storage directory:', error);
    // Final fallback
    let cwd = '.';
    try {
      // @ts-ignore - process is available in Electron with nodeIntegration
      if (typeof process !== 'undefined' && process.cwd) {
        // @ts-ignore
        cwd = process.cwd();
      }
    } catch (e) {
      // Ignore
    }
    const imageDir = path.join(cwd, 'todo-images');
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    return imageDir;
  }
}

// Copy an image file to the storage directory
export async function copyImage(sourcePath: string, todoId: string): Promise<string> {
  try {
    const imageDir = getImageStorageDir();
    const todoDir = path.join(imageDir, todoId);
    
    // Create todo-specific directory if it doesn't exist
    if (!fs.existsSync(todoDir)) {
      fs.mkdirSync(todoDir, { recursive: true });
    }
    
    // Generate unique ID for the image
    const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fileName = path.basename(sourcePath);
    const ext = path.extname(fileName);
    const destPath = path.join(todoDir, `${imageId}${ext}`);
    
    // Copy the file instead of creating a symlink
    // This works without admin privileges
    try {
      // Verify source file exists
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source image file does not exist: ${sourcePath}`);
      }
      
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Image copied from ${sourcePath} to ${destPath}`);
      
      // Verify destination file was created
      if (!fs.existsSync(destPath)) {
        throw new Error(`Destination image file was not created: ${destPath}`);
      }
      
      console.log(`Image file verified: ${destPath}`);
    } catch (error: any) {
      console.error('Error copying image file:', error);
      throw new Error(`Failed to copy image: ${error.message || 'Unknown error'}`);
    }
    
    return destPath;
  } catch (error) {
    console.error('Error copying image:', error);
    throw error;
  }
}

// Convert a file system path to a data URL for display in browser
// This avoids security restrictions with file:// URLs
export function getImageUrl(filePath: string): string {
  try {
    // If it's already a data URL or http(s) URL, return it
    if (filePath.startsWith('data:') || filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('Image file does not exist:', filePath);
      return ''; // Return empty string to trigger onError handler
    }
    
    // Read the file and convert to base64 data URL
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Determine MIME type based on extension
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      
      const mimeType = mimeTypes[ext] || 'image/png';
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      return dataUrl;
    } catch (readError) {
      console.error('Error reading image file:', readError, filePath);
      return ''; // Return empty string to trigger onError handler
    }
  } catch (error) {
    console.error('Error converting image path to data URL:', error, filePath);
    return ''; // Return empty string to trigger onError handler
  }
}

// Remove an image file
export async function removeImage(imagePath: string): Promise<void> {
  try {
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
        console.log(`Image removed: ${imagePath}`);
      } catch (error) {
        console.error('Error removing image file:', error);
        throw error;
      }
    } else {
      console.warn(`Image file not found: ${imagePath}`);
    }
  } catch (error) {
    console.error('Error removing image:', error);
    throw error;
  }
}

// Open file dialog to select an image
export async function openImageFileDialog(): Promise<string | null> {
  try {
    // Check if we're in Electron environment
    const isElectron = typeof window !== 'undefined' && 
                      ((window as any).process?.type === 'renderer' || 
                       (window as any).require || 
                       typeof require !== 'undefined');
    
    if (!isElectron) {
      console.warn('Not in Electron environment, file dialog unavailable');
      return null;
    }
    
    // Try IPC first (recommended approach)
    let ipcRenderer: any = null;
    
    // Try to get ipcRenderer from various sources
    try {
      if (typeof require !== 'undefined') {
        const electron = require('electron');
        ipcRenderer = electron.ipcRenderer;
      }
    } catch (e) {
      // require might not work in this context
    }
    
    if (!ipcRenderer && typeof window !== 'undefined' && (window as any).require) {
      try {
        const electron = (window as any).require('electron');
        ipcRenderer = electron.ipcRenderer;
      } catch (e) {
        // window.require might not work
      }
    }
    
    if (ipcRenderer && ipcRenderer.invoke) {
      try {
        console.log('Using IPC to open file dialog');
        const filePath = await ipcRenderer.invoke('open-image-dialog');
        console.log('IPC returned file path:', filePath);
        return filePath;
      } catch (ipcError) {
        console.warn('IPC invoke failed, trying direct access:', ipcError);
      }
    }
    
    // Fallback: Try direct Electron access (for older setups)
    const electronDialog = getElectronDialog();
    if (electronDialog) {
      const result = await electronDialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'] }
        ]
      });
      
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
    }
    
    // Final fallback: HTML5 file input (won't work for symlinks, but better than nothing)
    console.warn('Electron dialog not available, using HTML5 file input fallback');
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          // Try to get the path using webkitRelativePath or name
          // This won't give us the full system path, but we can try to work with it
          console.warn('HTML5 file input cannot provide full path for symlinks');
          // For now, return null - user will need Electron dialog
          resolve(null);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  } catch (error) {
    console.error('Error opening file dialog:', error);
    return null;
  }
}

// Clean up orphaned images for a todo item
export async function cleanupTodoImages(todoId: string, currentImagePaths: string[]): Promise<void> {
  try {
    const imageDir = getImageStorageDir();
    const todoDir = path.join(imageDir, todoId);
    
    if (!fs.existsSync(todoDir)) {
      return;
    }
    
    const files = fs.readdirSync(todoDir);
    for (const file of files) {
      const filePath = path.join(todoDir, file);
      if (!currentImagePaths.includes(filePath)) {
        try {
          await removeImage(filePath);
        } catch (error) {
          console.error(`Error cleaning up image ${filePath}:`, error);
        }
      }
    }
    
    // Remove todo directory if empty
    try {
      const remainingFiles = fs.readdirSync(todoDir);
      if (remainingFiles.length === 0) {
        fs.rmdirSync(todoDir);
      }
    } catch (error) {
      // Directory might not be empty or might have been removed
    }
  } catch (error) {
    console.error('Error cleaning up todo images:', error);
  }
}
