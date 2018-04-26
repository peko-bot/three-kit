/*
 * @Author: zy9@github.com/zy410419243 
 * @Date: 2018-04-24 15:34:46 
 * @Last Modified by: zy9
 * @Last Modified time: 2018-04-25 17:01:28
 */
import Trunk from './core/Trunk'
import * as THREE from 'three'

let trunk = new Trunk();

let refresh_pillar = document.getElementById('refreshPillar');
    refresh_pillar.addEventListener('click', () => search(), false);

// 显示等值面
let timeline = document.getElementById('timeline');
timeline.addEventListener('click', () => {
    trunk.show_texture({ transparent: true, opacity: 0.5 }, './data/images/20180404100000_20180416100000.png');
}, false);

trunk.init({
    container: document.getElementById('container'), // 画布挂载节点
    // clear_color: 0x4584b4, // 画布颜色
    mesh_shift_time: () => 2000, // 定义各板块移动速度
    child_mapping: child_mapping, // 手动设置实体贴图及其他，可以理解为遍历模型数据时的回调。该方法存在时，texture中只有select和top会生效
    // clientWidth: 1158,
    // clientHeight: 568,
    texture: {
        select: '#054B87',
        top: '#07205b'
    },
    set_material: materials => {
        let info = materials.materialsInfo;
        for(let key in info) {
            let value = info[key];

            // 初始化等值面
            key == 'texture' && (value.map_d = value.map_ka = value.map_kd = './data/images/20180413180000_20180416180000.png');
        }

        return materials;
    },
    data: {
        materials: ['./data/model/deqing08.mtl'],
        objects: ['./data/model/deqing08.obj'],
        load: (object, goon) => search(object, goon)
    },
    show_detail: child => { // 这方法主要是把点击的模型传出来，具体要做什么自己写
        let detail = document.getElementById('detail');

        // 当点到边界或者柱子的时候不移动模型
        if(Object.getOwnPropertyNames(child.userData).length != 0) {
            if (detail.children.length != 0) {
                /* 
                    这里图省事就直接清空原先的children建新表了
                    实际上该去修改innerHTML，会省很多性能
                */
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
        minDistance: 70,
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
            line: '#055290', // 内部乡镇边界贴图
            pillar: '#2377e8', // 柱子贴图
            top: '#07205b', // 上表面贴图
            border: '#2a8fdf', // 边缘边界贴图
            area: '#092573', // 柱子底下的圆
        };

        // 改变模型贴图
        switch(last_name) {
            case 'Line': // 内部乡镇边界贴图
                child.material.color.set(texture.line);
            break;

            case 'pillar': // 柱子贴图
                // child.material.map = new THREE.TextureLoader().load('./assets/texture/crate.jpg');
                // child.material.map = new THREE.CanvasTexture(get_text_canvas('测试', '#000'));
                child.material.color.set(texture.pillar);
            break;

            case 'border': // 边缘边界贴图
                child.material.color.set(texture.border);
            break;

            case 'texture': // 等值面
                child.visible = false;
            break;

            case 'bottom': // 底面

            break;

            case 'area': // 柱子下的圆
                child.material.color.set(texture.area);
            break;

            default: // 顶面贴图
                child.material.color.set(texture.top);
                // child.material.transparent = true;
                // child.material.opacity = 0.7;
            break;
        }
    }
}

// 请求新数据并刷新柱子
function search(object, goon) {
    // 请求业务数据，自行拼接参数。当然不用fetch也行，反正最终给goon传入新的模型对象就行了
    fetch('./data/simulation.json?t=' + ~~(Math.random() * 1000)).then(response => {
        return response.json();
    }).then(result => {
        object = object ? object : trunk.get_object();
        for(let item of result) { // 处理业务数据和模型数据，使板块和表格数据对应
            for(let jtem of object.children) {
                if(item.stcd == jtem.name.split('_')[0]) {
                    // 这个userData很关键，
                    // 点击板块时直接读取模型对象中userData的数据生成表格（如果需要），默认为空
                    jtem.userData = item;
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
    let data = Object.assign({ stnm: '-', val: '-' }, child.userData);
    let table = '', decorate = '';

    table += 
    '<table border="0" cellspacing="0" cellpadding="0" class="detail-table">' +
        '<tr class="header"> ' + 
            '<td colspan="3"></td>' + 
            '<td colspan="2">' + data.stnm + '</td>' +
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