/*
 * @Author: zy9@github.com/zy410419243
 * @Date: 2018-04-24 15:33:50
 * @Last Modified by: zy9
 * @Last Modified time: 2018-08-11 17:08:51
 */
import * as THREE from 'three';
import Loader from './Loader';
import OrbitControls from 'three-orbitcontrols';
import TWEEN from 'tween';
import extend from '../util/DeepClone';

import LifeCycle from './lifecycle';

export default class Trunk extends LifeCycle {
	constructor (config) {
		super(config);

		this.config = extend(this.config, config);

		this.initParams(this.config);
	}
	// 默认配置
	config = {
		// clearColor: 0x4584b4, // 画布颜色
		clearOpacity: 0.2, // 画布透明度
		meshShiftTime: () => Math.random() * 1000 * 5 + 1000, // 板块移动时间
		beforeInit: null, // 初始化前的钩子
		borderVisible: true, // 边界是否显示
		divisor: 100, // 控制柱子高度，该数越大，柱子越矮
		cameraPosition: { x: 0, y: 0, z: 65 }, // 相机position中的z
		afterRotation: -Math.PI / 4, // 开场动画后视角旋转角度
		rotationSpeed: 0.02, // 开场动画后视角旋转速度
		texture: {
			line: '#055290', // 内部乡镇边界贴图
			pillar: '#2377e8', // 柱子贴图
			top: '#07205b', // 上表面贴图
			bottom: '#000', // 底部贴图
			border: '#2a8fdf', // 边缘边界贴图
			select: '#071C5B', // 鼠标移入时贴图
		},
		light: () => { // x轴正方向是屏幕右边，y轴正方向是屏幕里边，z轴正方向是屏幕上边
			let lights = [];

			lights.push(new THREE.HemisphereLight(16777215, 16777215, 0.3));

			return lights;
		},
		controls: {
			maxPolarAngle: Math.PI * 0.75,
			minPolarAngle: Math.PI * 0.25,
		},
		clientWidth: document.documentElement.clientWidth || document.body.clientWidth,
		clientHeight: document.documentElement.clientHeight || document.body.clientHeight
	};

	_startPositions = {};
	_startTweenCount = 0;

	// 柱子高度变化的定时器
	intervals = {};

	// 鼠标移入板块高亮
	old = {};
	current = {};

	/**
	 * 渲染模型容器,相当于对div进行appendChild
     * 这里具体干的是往scene里加Object3D，然后所有模型都放在Object3D对象里
     * 原因是scene上不能直接渲染Mesh啊Group之类的对象，需要这么个载体
	*/
	root = {};

	// 标识模型是否移动过
	withdrawPosition = false;

	// 模型数据
	dataObject = {};

	// 多次用到容器节点，存到全局变量里方便调用
	container = {};

	// 整个模块的贴图，用作等值面
	modelTexture = {};

	// 初始化three渲染三要素
	camera = null;
	renderer = null;
	scene = null;

	// 轨道控制
	controls = null;

	// 初始化开场动画前板块位置
	initAreaPosition = (area, child) => {
		let { _startPositions } = this;

		let p = _startPositions[area];

		this.config.before_animate && this.config.before_animate(child);

		if (!p) {
			p = {
				x: Math.random() * 1000 - 500,
				y: Math.random() * 1000 - 500,
				z: Math.random() > 0.5 ? (Math.random() * 200 + 300) : (-Math.random() * 500 - 1000)
			};
			_startPositions[area] = p;
		}
		child.position.set(p.x, p.y, p.z);
	}

	// 处理开场动画参数
	dealObjectInLoadCirculStart = (child, visible) => {
		if (!child.name) {
			return;
		}
		// 设置上下边界是否显示
		if (/border$/.test(child.name)) {
			child.visible = visible;
		}

		if (child instanceof THREE.Mesh) {
			let area = child.name.split('_')[0];

			this.initAreaPosition(area, child);
		}
	}

	/**
     * 处理柱子渲染
     * @param child 当前遍历模型对象
     * @param divisor 计算柱子高度，柱子高度 = 当前模型中数据 / divisor * 15，也就是说divisor越小，柱子越高
    */
	changeModel4DataRefresh = (child, divisor) => {
		let name = child.name;

		if (/pillar$/.test(name)) {
			let dmName = name.split('_')[0];
			let data = child.userData.val;

			if (dmName) {
				let height = 0;
				let proportion = 0;

				if (divisor && divisor !== 0) {
					proportion = data / divisor;
					height = proportion * 15;
				}

				// 不支持负数，但万一传了负数，暂按0处理
				if (height <= 0) {
					child.visible = false;
				} else {
					this.setHeightSlow(child, height);
					child.visible = true;
				}
			} else {
				dmName = name ? name.split('_')[0] : '';
				// TODO 与上面height <= 0重复，代码需精简
				child.visible = false;
			}
		}
	};

	/**
     * 设置柱子高度（缓慢变高，高度从1开始变到指定高度）
     * 这个方法不要加太多逻辑，这里我试着在循环里console.log，渣电脑甚至能掉帧
     * @param child
     * @param height
     * @private
     */
	setHeightSlow = (child, height) => {
		this.setHeight(child, 1);
		let i = 1;
		let sh;
		// 柱子高度上升速度
		let times = 300;

		const show = () => {
			if (i < times) {
				let h = Math.floor(height * i / times);

				this.setHeight(child, h);
				i++;
			} else if (i === times) {
				i++;
				this.setHeight(child, height);
			} else {
				clearInterval(sh);
				delete this.intervals[sh];
			}
		};

		sh = setInterval(show, () => { });
		this.intervals[sh] = sh;
	};

	/**
     * 设置柱子高度
     * 这个方法不要加太多逻辑，这里我试着在循环里console.log，渣电脑甚至能掉帧
     * @param child
     * @param height
     * @private
     */
	setHeight = (child, height) => {
		if (height === 0 || isNaN(height)) {
			// 不能高度设置为0，否则下一次设置的时候会出问题，
			height = 1;
		}
		let geometry = child.geometry;

		geometry.verticesNeedUpdate = true;

		let vertices = geometry.vertices;

    	/*
         *   此处应该当有掌声，当然可能是写的人的特有感慨
         *   这里区分了顶面和底面的点，前提是给的模型数据里的柱子高度不能为0
		*
         *   下面这段代码看上去简单，但领悟到顶面和底面不能在同一个面上,否则就区分不出的痛整整花了一天时间
		*
		*	这里先区分z，不是特别花俏的柱子一般只有六个面八个点两种z
        *    然后底面的z不变，顶面的z加高度
        */
		let minz = vertices[0].z;

		for (let vertice of vertices) {
			let z = vertice.z;

			if (minz != z) {
				minz = Math.min(z, minz);
				break;
			}
		}
		for (let vertice of vertices) {
			if (vertice.z !== minz) {
				vertice.z = minz + height;
			}
		}
	};

	/**
     * 事件绑定
     * @private
     * @param config 模型配置文件
     * @param object .obj文件，所有模型数据。这里得注意跟child的区别，变量名写惯了都是object..
     */
	initListener = object => {
		this.container.addEventListener('mousemove', e => this.setMeshHighLightStatus(e), false);

		this.container.addEventListener('click', e => this.showDetail(e, object), false);
	};

	/*
        改变板块的高亮状态

        鼠标移上去，如果是板块，那改变该板块材质中的颜色
        移开后恢复原来的材质
        得注意边界线也是种模型，需要额外判断
    */
	setMeshHighLightStatus = event => {
		const { config } = this;
		let intersected = this.objectFromMouse(event.pageX, event.pageY);
		let child = intersected.object;

		let texture = config.texture;

		// 设置/移除高亮
		if (child) {
			let uuid = this.current && this.current.uuid;

			if (uuid === child.uuid) {
				return;
			}
			if (!child.name.includes('border') && !child.name.includes('line') && !child.name.includes('pillar') && !child.name.includes('texture') && !child.name.includes('river')) {
				if (!uuid) { // 第一次
					this.current = child;

					// 鼠标移入设置移入的颜色
					child.material.color.set(texture.select);
				} else {
					// 鼠标移开设置原先表面的颜色
					this.current.material.color.set(texture.top);

					this.old = this.current;
					this.current = child;

					// 鼠标移入设置移入的颜色
					child.material.color.set(texture.select);
				}
			}

		}
	}

	// 点击板块，板块左移，右边空出来的地方显示表格
	showDetail = (event, object) => {
		const { config } = this;

		event.preventDefault();

		let intersected = this.objectFromMouse(event.pageX, event.pageY);
		let child = intersected.object;

		if (child) {
			// 右侧表格数据的显示
			if (config.showDetail) {
				let flag = config.showDetail(child);

				this.meshMove(!!flag, object);
			}
		}
	}

	// 获得鼠标位置的板块模型对象
	objectFromMouse = (pagex, pagey) => {
		let { container } = this;
		const { offsetLeft, offsetTop } = this.renderer.domElement;

		let eltx = pagex - offsetLeft;
		let elty = pagey - offsetTop;

		let vpx = (eltx / container.offsetWidth) * 2 - 1;
		let vpy = -(elty / container.offsetHeight) * 2 + 1;
		let vector = new THREE.Vector2(vpx, vpy);
		let raycaster = new THREE.Raycaster();

		raycaster.setFromCamera(vector, this.camera);

		let intersects = raycaster.intersectObjects(this.root.children, true);

		if (intersects.length > 0) {
			let intersect = intersects[0];

			if (intersect) {
				return intersect;
			}
		}

		return { object: null, point: null, face: null };
	}

	// 获得元素相对整个页面的偏移量
	getOffset = (node, offset) => {
		if (!offset) {
			offset = {};
			offset.top = 0;
			offset.left = 0;
		}

		if (node == document.body) { // 当该节点为body节点时，结束递归
			return offset;
		}

		offset.top += node.offsetTop;
		offset.left += node.offsetLeft;

		return this.getOffset(node.parentNode, offset); // 向上累加offset里的值
	}

	/**
     * 整个模型漂移
     * 如果withdraw为true，表示需要把模型移开，即从中心点向左移
     *
     * 如果withdraw为false，表示需要还原至中心
     * @param withdraw 是否移开
     * @private
     */
	meshMove = (withdraw, object) => {
		let { camera, renderer, container, getMeshWidth, _getCoordinate2InScene, config } = this;
		let point = { x: 0, y: 0, z: 0 };
		let rotation = { x: -Math.PI / 4, y: 0, z: 0 };

		if (withdraw) {
			rotation = { x: -Math.PI / 4, y: Math.PI / 180 * 10, z: 0 };

			// 默认配比是500 * 300的设置
			let gap = container.clientWidth / 550;
			// 算移开的位置，移开的位置是固定的，只算一遍

			if (!this.withdrawPosition) {
				this.withdrawPosition = _getCoordinate2InScene({
					x: 30 * gap,
					y: renderer.domElement.offsetHeight / 2
				}, camera, renderer.domElement);

				// 避免飞出画布
				this.withdrawPosition.x += getMeshWidth(object).length / 4;

				this.tweenInOut(camera.position, { z: 80 }, 1000);
			}
			point = this.withdrawPosition;

			this.tweenInOut(object.position, point, 1000);
		} else {
    		/* 在开场动画结束后，模型需要填满整个页面，但点击板块显示详情时会出现空间不够的情况
            于是这里除了改变模型水平位置，还需要改变相机位置给详情腾地方

            至于为什么不改变模型的z...因为还有个轨道控制。如果改变了y，但模型仍旧是照着x轴旋转的，
            这就会造成模型转出屏幕的问题*/
			this.tweenInOut(camera.position, config.cameraPosition, 1000);
			this.tweenInOut(object.position, point, 1000);

			this.withdrawPosition = null;
		}
	}

	// 获得模型宽度
	getMeshWidth = object => {
		let c = 16711680, length = 0, width = 0, height = 0;
		let boxHelper = new THREE.BoxHelper(object, c);
		let box = new THREE.Box3().setFromObject(object);

		boxHelper.update();

		length = box.max.x - box.min.x;
		width = box.max.y - box.min.y;
		height = box.max.z - box.min.z;

		return { length, width, height };
	}

	// 定义各板块移动速度
	handleModelShift = child => {
		let { _startPositions, config } = this;

		let name = child.name.split('_');
		let area = name[0];

		if (!_startPositions[area]) {
			return;
		}

		return config.meshShiftTime && config.meshShiftTime();
	}

	/**
     * 遍历所有模型对象时的回调
     * @param {*} child 当前遍历模型
     */
	childMapping = child => {
		let { config } = this;

		config.childMapping && config.childMapping(child);
	}

	// 计算模型移动距离
	_getCoordinate2InScene = (i, d, c) => {
		d.updateMatrixWorld(true);

		let b = this.getVector2InScene(i, c);
		let j = new THREE.Vector3(b.x, b.y, 0);

		j.unproject(d);
		j.sub(d.position);
		j.normalize();

		let f = new THREE.Raycaster(d.position, j);
		let h = f.ray.origin;
		let g = f.ray.direction;
		let e = 0;
		let a = new THREE.Vector3();

		a.setX(h.x - ((h.z - e) * g.x / g.z));
		a.setY(h.y - ((h.z - e) * g.y / g.z));

		return a;
	}

	getVector2InScene = (a, c) => {
		let b = new THREE.Vector2();

		b.x = (a.x / c.offsetWidth) * 2 - 1;
		b.y = -(a.y / c.offsetHeight) * 2 + 1;

		return b;
	};

	/**
     * TWEEN动画，封装一下调用的时候写简单点
     * @param a 起点
     * @param b 终点
     * @param t 过渡时间
     * @param c 动画加载完成回调
     * @param s 动画开始回调
     */
	tweenInOut = (a, b, t, c, s) => {
		let tween = new TWEEN.Tween(a)
			.to(b, t)
			.easing(TWEEN.Easing.Exponential.InOut);

		c && tween.onComplete(c);
		s && tween.onStart(s);

		return tween.start();
	};

	/**
     * 递归加载、合并多个材质文件
     * TODO 弃用深拷贝，略浪费性能
     * @param {*} paths config.data.materials，数组
     * @param {*} loader 文件加载器
     * @param {*} material 加载完成后的材质对象，调用时传null就行了
     * @param {*} callback 加载完成后的回调，相当于ajax里的success，传回材质对象
     */
	loadMaterials = (paths, loader, material, callback) => {
		loader.load(paths[0], materials => {
			material ? material.materialsInfo = [...material.materialsInfo, ...materials.materialsInfo] : material = materials;

			paths.shift();

			paths.length != 0 ? loadMaterials(paths, loader, material, callback) : callback(material);
		});
	}

	/**
     * 递归加载、合并多个模型文件
     * TODO 弃用深拷贝，略浪费性能
     * @param {*} paths config.data.objects，数组
     * @param {*} loader 文件加载器
     * @param {*} object 加载完成后的模型对象，调用时传null就行了
     * @param {*} callback 加载完成后的回调，相当于ajax里的success，传回模型对象
     */
	loadObjects = (paths, loader, object, callback) => {
		loader.load(paths[0], objects => {
			object ? object.children = objects.children.concat(object.children) : object = extend({}, objects);

			paths.shift();

			paths.length != 0 ? loadObjects(paths, loader, object, callback) : callback(object);
		});
	}

	/**
     * 初始化参数
    */
	initParams = () => {
		const { config } = this;
		const { cameraPosition, clientWidth, clientHeight } = config;
		const { x, y, z } = cameraPosition;

		// 挂载画布的dom
		this.container = config.container;

		// 相机视锥体的长宽比
		const cameraAspect = clientWidth / clientHeight;

		this.camera = new THREE.PerspectiveCamera(45, cameraAspect, 1, 10000);
		this.camera.position.set(x, y, z);

		// 设置画布透明
		this.renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true
		});
		// this.renderer.setSize(clientWidth, clientHeight - 4);
		this.resize(clientWidth, clientHeight - 4);
		this.renderer.shadowMap.enabled = true; // 启用阴影选项
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.container.appendChild(this.renderer.domElement);

		this.scene = new THREE.Scene();
		this.scene.add(this.camera);

		// 初始化轨道控制
		let controls = new OrbitControls(this.camera, this.renderer.domElement);

		Object.assign(controls, config.controls);
		this.controls = controls;

		// 初始化光线
		if (config.light) {
			let lights = config.light();

			for (let light of lights) {
				this.scene.add(light);
			}
		}

		// 设置背景颜色
		config.clearColor && this.renderer.setClearColor(config.clearColor, config.clearOpacity);
	}

	/**
     * 完成开场动画后，相机视角变动
     * 一种是旋转mesh，一种是改变相机位置
     * 这是旋转mesh
     */
	afterMovementMesh = () => {
		const { afterRotation } = this.config;

		const rotateAnimate = () => {
			requestAnimationFrame(rotateAnimate);

			// 沿x轴旋转
			this.root.rotation.x >= afterRotation ? this.root.rotation.x -= this.config.rotationSpeed : null;

			this.renderer.render(this.scene, this.camera);
		};

		rotateAnimate();
	}

	/**
     * 预处理模型数据
     * @param object 模型数据
    */
	handleMesh = object => {
		let { config, _startTweenCount } = this;

		object.traverse(child => {
			if (child instanceof THREE.Group) {
				return;
			}
			if (child instanceof THREE.Mesh) {
				child.geometry = new THREE.Geometry().fromBufferGeometry(child.geometry);
			} else if (child instanceof THREE.Line) {
				console.log(child.name);
			}

			child.name == 'texture' && (this.modelTexture = child);

			this.dealObjectInLoadCirculStart(child, config.borderVisible);

			this.childMapping(child, config);

			let time = this.handleModelShift(child, config);

			// 开始动画
			this.tweenInOut(child.position, { x: 0, y: 0, z: 0 }, time, () => {
				_startTweenCount--;

				if (_startTweenCount === 0) {
					this.renderPillar(object);
					this.afterMovementMesh();

					// TODO 这里不该循环，应急
					for (let child of object.children) {
						this.config.before_animate && this.config.before_animate(child, true);
					}

					// 绑定事件，比如鼠标移到板块上高亮
					this.initListener(object);
				}
			});
			_startTweenCount++;
		});
	}

	/**
     * 显示贴图
     * @param material 传入的材质，最后和原材质中的属性合并
     * @param url 等值面图片地址
    */
	showTexture = (material, url) => {
		if (url) {
			new THREE.TextureLoader().load(url, map => {
				this.modelTexture.material.map = map;

				this.modelTexture.material = Object.assign(this.modelTexture.material, material);
				this.modelTexture.visible = !this.modelTexture.visible;
			});
		}

	}

	getObject = () => this.dataObject;

	/**
     * 更新数据并刷新柱子高度，也就是动画重播一遍
     * TODO 根据传入对象判断哪些对象需要更新
     * @param {*} object 新的模型对象
     */
	refreshPillar = object => {
		let { dataObject } = this;

		dataObject = object;
		this.renderPillar(dataObject);
	}

	flush = () => {
		// 实时渲染
		const render = () => {
			requestAnimationFrame(render);

			TWEEN.update();
			this.controls.update();

			this.renderer.render(this.scene, this.camera);
		};

		render();
	}

	// 渲染柱子
	renderPillar = object => {
		const { config } = this;

		object.traverse(child => {
			this.changeModel4DataRefresh(child, config.divisor);
		});
	}

	resize = (width = document.documentElement.clientWidth, height = document.documentElement.clientHeight - 4) => {
		this.renderer.setSize(width, height);
	}

	init = () => {
		let { config } = this;

		const { materials, objects } = config.data;

		// 初始化前的钩子
		config.beforeInit && config.beforeInit(config);

		const loader = new Loader(config);

		loader.load(materials, objects, object => {
			// 请求业务数据
			config.data.load(object, newObject => {
				this.dataObject = newObject;

				this.handleMesh(newObject);

				this.root = new THREE.Object3D().add(newObject);
				this.scene.add(this.root);

				this.flush();
			});
		});
	};
}