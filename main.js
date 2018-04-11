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
        container: document.getElementById('container'), // 画布挂载节点
        clear_color: 0x4584b4, // 画布颜色
        // mesh_shift_time: function(time) { // 定义各板块移动速度
        //     var duration = 1000;

        //     return Math.random() * duration * 5 + duration;
        // },
        border_visible: true, // 边界是否显示
        divisor: 12000, // 控制柱子高度，该数越大，柱子越矮
        texture: {
            line: '#045AAF', // 内部乡镇边界贴图
            pillar: '#1E8FF7', // 柱子贴图
            top: '#303471', // 上表面贴图
            bottom: '#000', // 底部贴图
            border: '#EBC9AE', // 边缘边界贴图
            select: '#071C5B', // 鼠标移入时贴图
        },
        light: function() {
            var lights = [];

            // 创建环境光
            var ambientLight = new THREE.AmbientLight(0xaaaaaa);
            lights.push(ambientLight);
            // 创建定向光源
            var directionalLight = new THREE.DirectionalLight(0xffeedd);
            // x轴正方向是屏幕右边，y轴正方向是屏幕里边，z轴正方向是屏幕上边
            directionalLight.position.set(-2, -2, 1);
            lights.push(directionalLight)

            return lights;
        },
        data: {
            materials: './data/model/deqing.mtl',
            objects: './data/model/deqing.obj',
            business: './data/simulation.json',
            business_callback: function(result, object) { // 处理业务数据和模型数据，使板块和表格数据对应
                for(var i = 0; i < result.length; i++) {
                    var item = result[i];
        
                    for(var j = 0; j < object.children.length; j++){
                        var jtem = object.children[j];
        
                        if(item.stcd == jtem.name.split('_')[0]){
                            /* 
                                这个userData很关键，
                                点击板块时直接读取模型对象中userData的数据生成表格（如果需要），默认为空
                            */
                            jtem.userData = item;
                        }
                    }
                }
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
            enableZoom: true, // 是否可以缩放
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