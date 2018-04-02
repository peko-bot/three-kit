require.config({
    paths:{
        'three': './third/three/three_r91',
        'mtl-loader': './third/three/loaders/MTLLoader',
        'obj-loader': './third/three/loaders/OBJLoader',
        'orbitControls': './third/three/controls/OrbitControls',
        'tween': './third/tween/Tween'
    },
})

require(['three', 'mtl-loader', 'obj-loader', 'orbitControls', 'tween'], function(THREE, MTLLoader, OBJLoader, OrbitControls, TWEEN){
    var clientWidth = document.documentElement.clientWidth || document.body.clientWidth;
    var clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    var container = document.getElementById('container');

    // 初始化参数
    this._startPositions = {};
    this._startTweenCount = 0;

    // 初始化three渲染三要素
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(clientWidth, clientHeight - 4);
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();

    var _camera_aspect = clientWidth / clientHeight;
    var camera = new THREE.PerspectiveCamera(45, _camera_aspect, 1, 10000);
    camera.position.z = 100;
    scene.add(camera);

    // 创建环境光，参数为十六进制的颜色
    var ambientLight = new THREE.AmbientLight(0xaaaaaa)
    // 创建定向光源，参数为十六进制的颜色
    var directionalLight = new THREE.DirectionalLight(0xffeedd)
    // 指定定向光源由z正半轴射向原点（平行光从屏幕外射向屏幕中心）
    directionalLight.position.set(0, 0, 1);

    scene.add(ambientLight);
    scene.add(directionalLight);

    // 初始化轨道控制
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    // 使动画循环使用时阻尼或自转 意思是否有惯性
    controls.enableDamping = true;
    // 是否可以缩放
    controls.enableZoom = true;

    // 加载模型数据
    var mtlLoader = new THREE.MTLLoader();

    mtlLoader.load('./data/model/deqing.mtl', function (materials) {
        var objLoader = new THREE.OBJLoader();

        objLoader.setMaterials(materials);
        objLoader.load('./data/model/deqing.obj', function (object) {
            object.traverse(function (child) {
                if (child instanceof THREE.Group) {
                    return;
                }
                if (child instanceof THREE.Mesh) {
                    child.geometry = new THREE.Geometry().fromBufferGeometry(child.geometry);
                } else {
                    if (child instanceof THREE.Line) {
                        child.material.lights = false;
                    }
                }
                // 初始化动画参数
                _dealObjectInLoadCirculStart(child);
                if (child.material) {
                    child.initialMaterial = child.material.clone();
                }

                // 开始动画
                var name = child.name.split('_');
				var last_name = name[name.length - 1];
                var area = name[0];
                
                if (area !== "china") {
					if(!this._startPositions[area]) {
						return;
					}

					// 定义各板块移动速度
					var time = this._startPositions[area].time;
					if (!time) {
						time = Math.random() * this._duration * 5 + this._duration;
						this._startPositions[area].time = time;
					}
					time = 2000;

                    // 开始动画
					var tween = new TWEEN.Tween(child.position)
						.to({x: 0, y: 0, z: 0}, time)
						.easing(TWEEN.Easing.Exponential.InOut)
						.onComplete(function () {
							this._startTweenCount--;
							if (this._startTweenCount === 0) {
                                console.log('complete')
								// this._afterMovement();
							}
                        }.bind(this));
                    tween.start();
					this._startTweenCount++;
				}
            });

            /* 
                渲染模型容器
                相当于对div进行appendChild，
                原因是scene上不能直接渲染Mesh啊Group之类的对象
            */
            var root = new THREE.Object3D();
            root.add(object);
            
            scene.add(root);

            function render(){
                requestAnimationFrame(render);
                TWEEN.update();
                renderer.render(scene, camera);
            }
            render();
        });
    });

    function _initAreaPosition(area, child) {
		var p = this._startPositions[area];
		if (!p) {
			p = {
				x: Math.random() * 1000 - 500,
				y: Math.random() * 1000 - 500,
				z: Math.random() > 0.5 ? (Math.random() * 200 + 300) : (-Math.random() * 500 - 1000)
			};
			this._startPositions[area] = p;
		}
		child.position.set(p.x, p.y, p.z);
    }

    function _dealObjectInLoadCirculStart(child) {
        if(!child.name) {
			return ;
		}
		child.receiveShadow = this._shadow;
		if (/_pillar$/.test(child.name)) {
			child.castShadow = this._shadow;
		} else if (/^(\w*_border)|(china_\w*)$/.test(child.name)) {
			// 中国及边线不显示，南海诸岛边线默认显示
			if ('nhzd_border' !== child.name) {
				child.visible = false;
			}
		}
		if (child instanceof THREE.Line) {
			if (!/^nhzd_jiuduanxian_[0-9]{2}$/.test(child.name)) {
				// 地区边线不显示，鼠标晃上去才显示
				child.visible = false;
			}
		}

        if (child instanceof THREE.Mesh) {
            var area = child.name.split('_')[0];
            if (area !== "china") {
                _initAreaPosition(area, child);
            }
        }
    }
});