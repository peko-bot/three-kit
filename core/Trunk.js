define([
    'three',
    'mtl-loader',
    'obj-loader',
    'orbitControls',
    'tween',
], function (THREE, MTLLoader, OBJLoader, OrbitControls, TWEEN) {
    // 初始化参数
    this._startPositions = {};
    this._startTweenCount = 0;
    // 柱子高度变化的定时器
    this._intervals = {};
    // 鼠标移入板块高亮
    this._old = {};
    this._current = {};
    /* 
        渲染模型容器,相当于对div进行appendChild
        这里具体干的是往scene里加Object3D，然后所有模型都放在Object3D对象里
        原因是scene上不能直接渲染Mesh啊Group之类的对象，需要这么个载体
    */
    this.root = {};
    
    var clientWidth = document.documentElement.clientWidth || document.body.clientWidth;
    var clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    var container = document.getElementById('container');

    // 多次用到容器节点，所以存到全局变量里方便调用
    this._container = container;

    // 初始化three渲染三要素
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(clientWidth, clientHeight - 4);
    // 设置背景颜色
    // renderer.setClearColor(0x4584b4);
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();

    // 相机视锥体的长宽比
    var _camera_aspect = clientWidth / clientHeight;
    var camera = new THREE.PerspectiveCamera(45, _camera_aspect, 1, 10000);
    camera.position.z = 100;
    scene.add(camera);

    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;

    // 加载模型数据
    var mtlLoader = new THREE.MTLLoader();

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

    function _dealObjectInLoadCirculStart(child, visible) {
        if(!child.name) {
            return;
        }
        child.receiveShadow = this._shadow;
        if (/_pillar$/.test(child.name)) {
            child.castShadow = this._shadow;
        } else if (/^(\w*_border)|(china_\w*)$/.test(child.name)) {
            child.visible = visible;
        }

        if (child instanceof THREE.Mesh) {
            var area = child.name.split('_')[0];
            if (area !== "china") {
                _initAreaPosition(area, child);
            }
        }
    }

    function _changeModel4DataRefresh(child, object, maxData) {
        var name = child.name;
        
        if (/_pillar$/.test(name)) {
            var dmName = name.split('_')[0];
            var data = child.userData.val;
            if(dmName) {
                var height = 0;
                var proportion = 0;

                if (maxData && 0 !== maxData) {
                    proportion = data / maxData;
                    height = proportion * 15;
                }

                // 不支持负数，但万一传了负数，暂按0处理
                if(height <= 0) {
                    child.visible = false;
                } else {
                    _setHeightSlow(child, height);
                    child.visible = true;
                }
            } else {
                dmName = name ? name.split("_")[0] : '';
                // TODO 与上面height<=0重复，代码需精简
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
    function _setHeightSlow(child, height) {
        _setHeight(child, 1);
        var i = 1;
        var sh;
        // 柱子高度上升速度
        var times = 300;

        function show() {
            if (i < times) {
                var h = Math.floor(height * i / times);
                _setHeight(child, h);
                i++;
            } else if (i === times) {
                i++;
                _setHeight(child, height);
            } else {
                clearInterval(sh);
                delete this._intervals[sh];
            }
        }

        sh = setInterval(show, this._hightslowinterval);
        this._intervals[sh] = sh;
    };
    
    /**
     * 设置模型高度
     * 这个方法不要加太多逻辑，这里我试着在循环里console.log，渣电脑甚至能掉帧
     * @param child
     * @param height
     * @private
     */
    function _setHeight(child, height) {
        if (height === 0 || isNaN(height)) {
            // 不能高度设置为0，否则下一次设置的时候会出问题，
            height = 1;
        }
        var geometry = child.geometry;

        geometry.verticesNeedUpdate = true;
        var vertices = geometry.vertices;

        /* 
            此处应该当有掌声，当然可能写的人的特有感慨
            这里区分了顶面和底面的点，前提是给的模型数据里的柱子高度不能为0

            下面这段代码看上去简单，但领悟到顶面和底面不能在同一个面上,否则就区分不出的痛整整花了一天时间

            这里先区分z，不是特别花俏的柱子一般只有六个面八个点两种z
            然后底面的z不变，顶面的z加高度
        */
        var minz = vertices[0].z;
        for (var i = 1, size = vertices.length; i < size; i++) {
            var z = vertices[i].z;
            if (minz != z) {
                minz = Math.min(z, minz);
                break;
            }
        }
        for (var i = 0, size = vertices.length; i < size; i++) {
            var vertice = vertices[i];
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
    function _initListener(config, object, dom) {
        dom.addEventListener('mousemove', function(e) {
            return _setMeshHighLightStatus(e, config);
        }, false);

        dom.addEventListener('click', function(e) {
            return _showDetail(e, object, config);
        }, false);
    };
    
    /* 
        改变板块的高亮状态

        鼠标移上去，如果是板块，那改变该板块材质中的颜色
        移开后恢复原来的材质
        得注意边界线也是种模型，需要额外判断
    */
    function _setMeshHighLightStatus(event, config) {
        var intersected = _objectFromMouse(event.pageX, event.pageY);
        var child = intersected.object;

        var texture = config.texture;

        // 设置/移除高亮
        if(child) {
            var uuid = this._current && this._current.uuid;
            if(uuid === child.uuid) {
                return;
            }else {
                if(!uuid){ // 第一次
                    if(!/_border$/.test(child.name) && !/_bottom$/.test(child.name) && !/_Line$/.test(child.name) && !/_pillar$/.test(child.name)){
                        this._current = child;
                        
                        child.material.color.set(texture.select);
                    }
                }else {
                    if(!/_border$/.test(child.name) && !/_bottom$/.test(child.name) && !/_Line$/.test(child.name) && !/_pillar$/.test(child.name)){
                        this._current.material.color.set(texture.top);
    
                        this._old = this._current;
                        this._current = child;
                        
                        child.material.color.set(texture.select);
                    }
                }

            }
        }else { // 重置所有板块材质
            
        }
    }

    /* 
        点击板块，板块左移，右边空出来的地方显示表格
    */
    function _showDetail(event, object, config) {
        event.preventDefault();

        var intersected = _objectFromMouse(event.pageX, event.pageY);
        var child = intersected.object;

        if(child) {
            // 右侧表格数据的显示
            if(config.show_table) {
                config.show_table(child);
                _meshMove(true, object);
            }
        }
    }

    // 获得鼠标位置的板块模型对象
    function _objectFromMouse(pagex, pagey) {
        var offset = _getOffset(this.renderer.domElement);
        var eltx = pagex - offset.left;
        var elty = pagey - offset.top;
        var container = this._container;

        var vpx = (eltx / container.offsetWidth) * 2 - 1;
        var vpy = -(elty / container.offsetHeight) * 2 + 1;
        var vector = new THREE.Vector2(vpx, vpy);
        var raycaster = new THREE.Raycaster();

        raycaster.setFromCamera(vector, this.camera);

        var intersects = raycaster.intersectObjects(this.root.children, true);

        var len = intersects.length;
        if (len > 0) {
            var intersect = intersects[0];
            if (intersect) {
                return intersect;
            }
        }

        return { object: null, point: null, face: null };
    }

    // 获得元素相对整个页面的偏移量
    function _getOffset(node, offset) {
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

        return _getOffset(node.parentNode, offset); // 向上累加offset里的值
    }

    /** 
     * @param flag 是否显示边界
     * @param perfix 模型文件中边界名称
    */
    function _setBorderVisible(child, flag, prefix) {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            // 开场动画完成后显示地图边界
            child.name.slice(0, prefix.length) === prefix && (child.visible = flag);
        }
    }

    /**
     * 整个模型漂移
     * 如果withdraw为true，表示需要把模型移开，即从中心点向左移
     *
     * 如果withdraw为false，表示需要还原至中心
     * @param withdraw 是否移开
     * @private
     */
    function _meshMove(withdraw, object) {
        var point = { x: 0, y: 0, z: 0 };
        var rotation = { x: -Math.PI / 4, y: 0, z: 0 };
        var root = this.root.rotation;

        if (withdraw) {
            rotation = { x: -Math.PI / 4, y: Math.PI / 180 * 10, z: 0 };
            
            // 默认配比是500 * 300的设置
            var gap = this._container.clientWidth / 550;
            // 算移开的位置，移开的位置是固定的，只算一遍
            if (!this._withdrawPosition) {
                this._withdrawPosition = _getCoordinate2InScene({
                    x: 30 * gap,
                    y: this.renderer.domElement.offsetHeight / 2
                }, this.camera, this.renderer.domElement);

                // x 的位置需要加上模型宽的一半，避免飞出
                this._withdrawPosition.x += getMeshWidth(object) / 2;
            }
            point = this._withdrawPosition;
        }

        if (this._meshTween) {
            TWEEN.remove(this._meshTween);
            this._meshTween = null;
        }
        this._meshTween = _tweenInOut(object.position, { x: point.x, y: 0, z: 0 }, 1000);
    };
    
    // 获得模型宽度
    function getMeshWidth(object) {
        var c = 16711680, length = 0;
        var boxHelper = new THREE.BoxHelper(object, c);
        var box = new THREE.Box3().setFromObject(object);

        boxHelper.update();

        length = box.max.x - box.min.x;

        return length;
    }

    function _set_material(child, config) {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            var name = child.name.split('_');
            var last_name = name[name.length - 1];

            var texture = config.texture;

            // 改变模型贴图
            switch(last_name) {
                case 'Line': // 内部乡镇边界贴图
                    child.material.color.set(texture.line);
                break;

                case 'pillar': // 柱子贴图
                    child.material.color.set(texture.pillar);
                    // child.material.map = new THREE.TextureLoader().load("../assets/texture/crate.jpg");
                break;

                case 'bottom': // 底部贴图
                    child.material.color.set(texture.bottom);
                break;
            }

            if(name.length == 1) { // 上层表面贴图
                child.material.color.set(texture.top);
                // child.material.opacity = 0.1;
            }
        }
    }

    // 计算模型移动距离
    function _getCoordinate2InScene(i, d, c) {
        d.updateMatrixWorld(true);
        var b = getVector2InScene(i, c);
        var j = new THREE.Vector3(b.x, b.y, 0);
        j.unproject(d);
        j.sub(d.position);
        j.normalize();
        var f = new THREE.Raycaster(d.position, j);
        var h = f.ray.origin;
        var g = f.ray.direction;
        var e = 0;
        var a = new THREE.Vector3();
        a.setX(h.x - ((h.z - e) * g.x / g.z));
        a.setY(h.y - ((h.z - e) * g.y / g.z));
        return a;
    }

    function getVector2InScene(a, c) {
        var b = new THREE.Vector2();
        b.x = (a.x / c.offsetWidth) * 2 - 1;
        b.y = -(a.y / c.offsetHeight) * 2 + 1;
        return b;
    };

    /**
     * TWEEN动画，封装一下调用的时候写简单点
     * @param a 起点
     * @param b 终点
     * @param t 过渡时间
     */
    function _tweenInOut(a, b, t, c, s) {
        var tween = new TWEEN.Tween(a)
            .to(b, t)
            .easing(TWEEN.Easing.Exponential.InOut);
        if(c) {
            tween.onComplete(c);
        }
        if(s) {
            tween.onStart(s);
        }
        return tween.start();
    };

    /* 
        完成开场动画后，相机视角变动
        一种是旋转mesh，一种是改变相机位置
        这是旋转mesh
    */
    function _afterMovementMesh(root, scene, camera, renderer) {
        // 旋转速度
        var speed = 0.02;

        var rotateAnimate = function(){
            requestAnimationFrame(rotateAnimate);
            
            // y轴正半轴朝上
            // this.root.position.y <= 0 ? this.root.position.y += 0.8 : null;
            // 沿x轴旋转
            root.rotation.x >= -Math.PI / 4 ? root.rotation.x -= speed : null;
            renderer.render(scene, camera);
        };

        rotateAnimate();
    }
    
    var init = function(_config) {
        // 初始化轨道控制
        var controls = new THREE.OrbitControls(camera, renderer.domElement);
        Object.assign(controls, _config.controls);

        // 初始化光线
        if(_config.light){
            var lights = _config.light();
            for(var i = 0; i < lights.length; i++) {
                scene.add(lights[i]);
            }
        }

        // 设置背景颜色
        // renderer.setClearColor(0x4584b4);
        _config.clear_color && renderer.setClearColor(_config.clear_color);

        mtlLoader.load(_config.data.materials, function(materials) {
            var objLoader = new THREE.OBJLoader();

            objLoader.setMaterials(materials);
            objLoader.load(_config.data.objects, function(object) {
                this.root = new THREE.Object3D().add(object);
                scene.add(root);

                // 请求业务数据
                fetch(_config.data.business).then(function(response) {
                    if(_config.data.business_callback){
                        return _config.data.business_callback(response);
                    }
                    return response.json();
                }).then(function(result) {
                    object.traverse(function(child) {
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

                        _set_material(child, _config);

                        // 初始化动画参数
                        _dealObjectInLoadCirculStart(child, _config.bottom_border_visible);
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
                            if(!time) {
                                if(_config.mesh_shift_time){
                                    time = this._startPositions[area].time = _config.mesh_shift_time(time);
                                }else {
                                    time = 2000;
                                }
                            }
        
                            // 开始动画
                            _tweenInOut(child.position, { x: 0, y: 0, z: 0 }, time, function () {
                                this._startTweenCount--;
                                if (this._startTweenCount === 0) {
                                    // 求最大值，用于计算柱子高度
                                    var maxData = 0;
                                    // 处理业务数据和模型数据，使之一一对应
                                    for(var i = 0; i < result.length; i++){
                                        var item = result[i];

                                        maxData = Math.max(item.val, maxData);

                                        for(var j = 0; j < object.children.length; j++){
                                            var jtem = object.children[j];

                                            /* 
                                                如果加上正则验证，也就是非柱子的模型数据userData为空时，传到表格那边就会为空
                                                在点击板块时是根据鼠标点击位置获得对象的，也就是说如果不点柱子是不会有数据的
                                                待修正 mark
                                            */
                                            // if(item.stcd == jtem.name.split('_')[0] && /_pillar$/.test(jtem.name)){
                                            if(item.stcd == jtem.name.split('_')[0]){
                                                jtem.userData = item;
                                            }
                                        }
                                    }

                                    // 渲染柱子
                                    object.traverse(function (child) {
                                        _changeModel4DataRefresh(child, object, maxData);

                                        _setBorderVisible(child, _config.top_border_visible, _config.top_border_prefix);
                                    });
                                    _afterMovementMesh(root, scene, camera, renderer);

                                    // 绑定事件，比如鼠标移到板块上高亮
                                    _initListener(_config, object, container);
                                }
                            }.bind(this));
                            this._startTweenCount++;
                        }
                    });
        
                    function render(){
                        requestAnimationFrame(render);
                        TWEEN.update();
                        renderer.render(scene, camera);
                    }
                    render();
                });
            });
        });
    };

    return function() {
        this.init = init;
    };
})