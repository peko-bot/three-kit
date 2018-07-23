/*
 * @Author: zy9@github.com/zy410419243
 * @Date: 2018-07-22 22:14:42
 * @Last Modified by: zy9
 * @Last Modified time: 2018-07-23 21:45:15
 * @Description: 递归加载数组中所有mtl跟obj文件
 */
import MTLLoader from '../loader/MTLLoader';
import OBJLoader from '../loader/OBJLoader';
import extend from '../util/DeepClone';

export default class Loader {
	constructor (config, mtlLoader, objectLoader) {
		this.mtlLoader = mtlLoader ? mtlLoader : new MTLLoader();
		this.objectLoader = objectLoader ? objectLoader : new OBJLoader();
		this.config = config;
	}

	load = (mtlUrl, objUrl, callback) => {
		const { config } = this;

		this.loadMaterials(mtlUrl, null, materials => {
    		config.setMaterial && (materials = config.setMaterial(materials));

    		let objLoader = new OBJLoader();

    		objLoader.setMaterials(materials);

    		this.loadObjects(objUrl, null, objects => callback(objects));
    	});
	}

	/**
     * 递归加载、合并多个材质文件
     * TODO 弃用深拷贝，略浪费性能
     * @param {*} paths config.data.materials，数组
     * @param {*} material 加载完成后的材质对象，调用时传null就行了
     * @param {*} callback 加载完成后的回调，相当于ajax里的success，传回材质对象
     */
    loadMaterials = (paths, material, callback) => {
    	this.mtlLoader.load(paths[0], materials => {
    		material ? material.materialsInfo = [...material.materialsInfo, ...materials.materialsInfo] : material = materials;

    		paths.shift();

    		paths.length != 0 ? loadMaterials(paths, material, callback) : callback(material);
    	});
    }

	/**
     * 递归加载、合并多个模型文件
     * TODO 弃用深拷贝，略浪费性能
     * @param {*} paths config.data.objects，数组
     * @param {*} object 加载完成后的模型对象，调用时传null就行了
     * @param {*} callback 加载完成后的回调，相当于ajax里的success，传回模型对象
     */
    loadObjects = (paths, object, callback) => {
    	this.objectLoader.load(paths[0], objects => {
    		object ? object.children = objects.children.concat(object.children) : object = extend({}, objects);

    		paths.shift();

    		paths.length != 0 ? loadObjects(paths, object, callback) : callback(object);
    	});
    }
}