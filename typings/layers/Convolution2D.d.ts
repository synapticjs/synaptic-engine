import Network, { IBoundary, INetworkLayer } from '../Network';
export default class Convolution2D implements INetworkLayer {
    filter: number;
    depth: number;
    stride: number;
    padding: number;
    layer: number[];
    constructor({filter, depth, stride, padding}: {
        filter?: number;
        depth?: number;
        stride?: number;
        padding?: number;
    });
    init(network: Network, boundary: IBoundary): IBoundary;
    isValid(boundary: any, x: any, y: any, z: any): boolean;
}