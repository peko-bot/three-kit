/*
 * @Author: zy9@github.com/zy410419243 
 * @Date: 2018-04-24 15:34:46 
 * @Last Modified by: zy9
 * @Last Modified time: 2018-04-28 15:27:04
 */
import Trunk from './core/Trunk'
import * as THREE from 'three'

window.onload = () => {
    let trunk = new Trunk();

    // 刷新数据和柱子
    let refresh_pillar = document.getElementById('refreshPillar');
    refresh_pillar.addEventListener('click', () => search(), false);

    // 显示等值面
    let timeline = document.getElementById('timeline');
    timeline.addEventListener('click', () => {
        trunk.show_texture({ transparent: true, opacity: 0.5 }, './assets/data/images/20180404100000_20180416100000.png');
    }, false);

    trunk.init({
        container: document.getElementById('container'), // 画布挂载节点
        // clear_color: 0x4584b4, // 画布颜色
        mesh_shift_time: () => 2000, // 定义各板块移动速度
        child_mapping: child_mapping, // 手动设置实体贴图及其他，可以理解为遍历模型数据时的回调。该方法存在时，texture中只有select和top会生效
        // clientWidth: 1158,
        // clientHeight: 568,
        light: () => {
            let lights = [];

            // var pointColor = "white";
            // var directionalLight = new THREE.DirectionalLight(pointColor);
            // directionalLight.castShadow = true; // 启用阴影选项
            // directionalLight.position.set(-180, -150, 200);
            // lights.push(directionalLight);

            // let ambientLight = new THREE.AmbientLight('white');
            // ambientLight.castShadow = true;
            // lights.push(ambientLight);

            let hemisphere = new THREE.HemisphereLight(16777215, 16777215, 0.3);
            lights.push(hemisphere);

            let light = new THREE.DirectionalLight(16777215, 0.85);
            light.position.set(-150, 25, 50);
            light.castShadow = true;
            lights.push(light);

            let light2 = new THREE.DirectionalLight(16777215, 0.85);
            light2.position.set(-100, 250, 50);
            light2.castShadow = true;
            lights.push(light2);

            let spotLight = new THREE.SpotLight("white", 8, 250, 0.44, 1, 2);
            spotLight.position.set(-60, -30, 140);
            spotLight.angle = -Math.PI / 4;
            lights.push(spotLight);

            let spotLight2 = new THREE.SpotLight(16777215, 1);
            spotLight2.position.set(-100, 200, 20);
            spotLight2.angle = Math.PI / 4;
            spotLight2.penumbra = 0.05;
            spotLight2.decay = 1.5;
            spotLight2.distance = 1000;
            lights.push(spotLight2);

            // for(let item of lights) {
            //     item.castShadow = true;
            // }

            return lights;
        },
        texture: {
            select: '#06dbab',
            top: '#067acf'
        },
        divisor: 250,
        set_material: materials => {
            let info = materials.materialsInfo;
            for(let key in info) {
                let value = info[key];

                // 初始化等值面
                key == 'texture' && (value.map_d = value.map_ka = value.map_kd = './assets/data/images/20180413180000_20180416180000.png');
            }

            return materials;
        },
        data: {
            materials: ['./assets/data/model/deqing12.mtl'],
            objects: ['./assets/data/model/deqing12.obj'],
            load: (object, goon) => search(object, goon)
        },
        show_detail: child => { // 这方法主要是把点击的模型传出来，具体要做什么自己写
            let detail = document.getElementById('detail');

            // 当点到边界或者柱子的时候不移动模型
            if(Object.getOwnPropertyNames(child.userData).length != 0) {
                if (detail.children.length != 0) {
                    // 这里图省事就直接清空原先的children建新表了
                    // 实际上该去修改innerHTML，会省很多性能
                    for(let i = 0; i < detail.children.length; i++) {
                        detail.removeChild(detail.children[i]);
                    }
                    createTable(child, detail);
                } else {
                    // 如果表格不存在，创建
                    createTable(child, detail);
                }
                return true;
            }

            return false;
        },
        controls: { // 轨道控制参数
            maxPolarAngle: Math.PI * 0.75,
            minPolarAngle: Math.PI * 0.25,
            maxDistance: 200,
            minDistance: 65,
            maxAzimuthAngle: 0, // 不能右旋
            minAzimuthAngle: 0 // 不能左旋
        }
    });

    /**
     * 遍历所有模型对象时的回调 
     * @param {*} child 当前遍历模型
     */
    function child_mapping(child) {
        if(child instanceof THREE.Mesh || child instanceof THREE.Line) {
            let name = child.name.split('_');
            let last_name = name[name.length - 1];

            let texture = {
                line: '#1afeff', // 内部乡镇边界贴图
                pillar: '#ca7cf4', // 柱子贴图
                top: '#067acf', // 上表面贴图
                border: '#59ffff', // 边缘边界贴图
                area: '#092573', // 柱子底下的圆
            };

            // 改变模型贴图
            switch(last_name) {
                case 'line': // 内部乡镇边界贴图
                    child.material.color.set(texture.line);
                break;

                case 'pillar': // 柱子贴图
                    // child.material.map = new THREE.TextureLoader().load('./assets/texture/crate.jpg');
                    // child.material.map = new THREE.CanvasTexture(get_text_canvas('测试', '#000'));
                    child.material.color.set(texture.pillar);
                    child.castShadow = true; // 启用阴影选项
                break;

                case 'border': // 边缘边界贴图
                    child.material.color.set(texture.border);
                break;

                case 'texture': // 等值面
                    child.visible = false;
                break;

                case 'bottom': // 底面
                    child.receiveShadow = true; // 启用接受阴影选项
                    child.material.color.set(texture.top);
                break;

                case 'area': // 柱子下的圆
                    // child.material.color.set(texture.area);
                    child.material.visible = false;
                break;

                default: // 顶面贴图
                    child.receiveShadow = true; // 启用接受阴影选项
                    child.material.color.set(texture.top);
                    child.material.transparent = true;
                    child.material.opacity = 0.7;
                break;
            }
        }
    }

    // 请求新数据并刷新柱子
    function search(object, goon) {
        // 请求业务数据，自行拼接参数。当然不用fetch也行，反正最终给goon传入新的模型对象就行了
        fetch('./assets/data/simulation.json?t=' + ~~(Math.random() * 1000)).then(response => {
            return response.json();
        }).then(result => {
            object = object ? object : trunk.get_object();

            for(let item of result.data) { // 处理业务数据和模型数据，使板块和表格数据对应
                for(let jtem of object.children) {
                    if(item.area_code == jtem.name.split('_')[0]) {
                        // 这个userData很关键，
                        // 点击板块时直接读取模型对象中userData的数据生成表格（如果需要），默认为空
                        jtem.userData = Object.assign({ area_name: '', val: '', area_code: '' }, item);
                    }
                }
            }
            goon ? goon(object) : trunk.refresh_pillar(object);
        });
    }

    // 创建柱子贴图
    function get_text_canvas(text, style) {
        let canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;

        let context = canvas.getContext( '2d' );
        context.beginPath();
        context.font='50px Microsoft YaHei';
        context.fillStyle = style;
        context.fillText(text, 0, 50);
        context.fill();
        context.stroke();

        return canvas;
    }

    // 创建表格元素
    function createTable(child, element) {
        let data = Object.assign({ area_name: '', val: '', area_core: '' }, child.userData);
        let table = '', decorate = '';

        table += 
        '<table border="0" cellspacing="0" cellpadding="0" class="detail-table">' +
            '<tr class="header"> ' + 
                '<td colspan="3"></td>' + 
                '<td colspan="2">' + data.area_name + '</td>' +
            '</tr>'+

            '<tr>' + 
                '<td colspan="5"></td>' + 
            '</tr>' + 

            '<tr>' + 
                '<td class="title" colspan="3">' + '水位' + '</td>' +
                '<td class="value" colspan="2">' + data.val + '</td>' +
            '</tr>' +

            '<tr>' + 
                '<td colspan="5"></td>' + 
            '</tr>' +
        '</table>';

        decorate += '<div class="decorate"></div>'

        element.innerHTML += table + decorate;
    };
}