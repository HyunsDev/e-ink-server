export type GrayColor = number | string;

export interface ScreenScene {
  width: number;
  height: number;
  background?: GrayColor;
  nodes: SceneNode[];
}

interface BaseNode {
  type: string;
}

interface BaseShapeNode extends BaseNode {
  fill?: GrayColor;
  stroke?: GrayColor;
  strokeWidth?: number;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  x: number;
  y: number;
  maxWidth?: number;
  fontFamily?: string;
  fontSize: number;
  fontWeight?: number | string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  color?: GrayColor;
}

export interface RectNode extends BaseShapeNode {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoundRectNode extends BaseShapeNode {
  type: "roundRect";
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export interface LineNode extends BaseNode {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: GrayColor;
  strokeWidth?: number;
}

export interface CircleNode extends BaseShapeNode {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
}

export interface EllipseNode extends BaseShapeNode {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface GroupNode extends BaseNode {
  type: "group";
  x?: number;
  y?: number;
  nodes: SceneNode[];
}

export type SceneNode =
  | TextNode
  | RectNode
  | RoundRectNode
  | LineNode
  | CircleNode
  | EllipseNode
  | GroupNode;
