require.config({
    paths:{
        'three': './third/three/three_r91',
        'mtl-loader': './third/three/loaders/MTLLoader',
        'obj-loader': './third/three/loaders/OBJLoader',
        'orbitControls': './third/three/controls/OrbitControls',
        'tween': './third/tween/Tween',
        'trunk': './core/Trunk'
    },
})

require(['three', 'trunk'], function(THREE, Trunk){
    var Trunk = new Trunk();
    Trunk.init({
        clear_color: 0x4584b4, // 画布颜色
        top_border_visible: true, // 是否显示上边界
        bottom_border_visible: false, // 是否显示下边界
        top_border_prefix: 'deqing', // 模型文件中边界名称
        // mesh_shift_time: function(time) { // 定义各板块移动速度
        //     var duration = 1000;

        //     return Math.random() * duration * 5 + duration;
        // },
        divisor: 12000,
        texture: {
            line: '#045AAF', // 内部乡镇边界贴图
            pillar: '#1E8FF7', // 柱子贴图
            bottom: '#0E2C6A', // 底部贴图
            top: '#000', // 上表面贴图
            select: '#071C5B', // 鼠标移入时贴图
        },
        light: function() {
            var lights = [];

            // 创建环境光
            var ambientLight = new THREE.AmbientLight(0xaaaaaa);
            lights.push(ambientLight);
            // 创建定向光源
            var directionalLight = new THREE.DirectionalLight(0xffeedd);
            // 指定定向光源由z正半轴射向原点（平行光从屏幕外射向屏幕中心）
            directionalLight.position.set(0, 0, 1);
            lights.push(directionalLight)

            return lights;
        },
        data: {
            materials: './data/model/deqing.mtl',
            objects: './data/model/deqing.obj',
            business: './data/simulation.json',
            business_callback: function(response) {
                var result = response.json();

                return result;
            },
        },
        show_table: function(child) {
            var detail = document.getElementById('detail');

            if (detail.children.length != 0) {
                /* 
                    这里图省事就直接清空原先的children建新表了
                    实际上该去修改innerHTML，会省很多性能
                */
            for(var i = 0; i < detail.children.length; i++){
                detail.removeChild(detail.children[i]);
            }
                createTable(child, detail);
            } else {
                // 如果表格不存在，创建
                createTable(child, detail);
            }
        },
        controls: { // 轨道控制参数
            enableDamping: true, // 使动画循环使用时阻尼或自转，意思是否有惯性
            enableZoom: false, // 是否可以缩放
            enabled: true, // 是否启用轨道控制
        }
    });

    // 创建表格元素
    function createTable(child, element) {
        var data = child.userData;
        var table = '', decorate = '';

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
});