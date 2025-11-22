export enum ViewMode {
  EDITOR = 'EDITOR',
  PREVIEW = 'PREVIEW',
  SUCCESS = 'SUCCESS',
  ORDERS = 'ORDERS',
  TEMPLATES = 'TEMPLATES'
}

export interface PhoneModel {
  id: string;
  name: string;
  brand: string;
  width: number; // in mm (or SVG units)
  height: number; // in mm (or SVG units)
  minX?: number; // Top-left X coordinate from original SVG
  minY?: number; // Top-left Y coordinate from original SVG
  screenRatio: number; // width / height
  svgPath: string; // The outer shape of the phone
  cameraPath: string; // The camera bump cutout
  safeZonePath: string; // Dashed line for print safety
}

export interface TextElement {
  id: string;
  text: string;
  fontFamily: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  fontSize: number; // Base font size
  color: string; // Text color (hex format)
}

export interface DesignState {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  imageSrc: string | null;
  imgWidth?: number; // Natural width of the uploaded image
  imgHeight?: number; // Natural height of the uploaded image
  textElements?: TextElement[]; // Array of text elements
}

export interface OrderSubmission {
  id: string;
  modelId: string;
  modelName: string;
  design: DesignState;
  timestamp: number;
  printFileUrl: string; // High res blob URL
}