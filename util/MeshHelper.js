define(['three'], function (THREE) {
    var MeshHelper = {
        objectFromMouse(pagex, pagey) { // 获得鼠标位置的板块模型对象
            var offset = MeshHelper.getOffset(this.renderer.domElement);
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
        },
        getOffset(node, offset) { // 获得元素相对整个页面的偏移量
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
        },
        /** 
         * @param flag 是否显示边界
         * @param perfix 模型文件中边界名称
        */
        setBorderVisible(child, flag, prefix) { 
            if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                // 开场动画完成后显示地图边界
                child.name.slice(0, prefix.length) === prefix && (child.visible = flag);
            }
        },
        /* 
            完成开场动画后，相机视角变动
            一种是旋转mesh，一种是改变相机位置
            这是旋转mesh
        */
        afterMovementMesh(root, scene, camera, renderer) {
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
    }

    return MeshHelper;
});