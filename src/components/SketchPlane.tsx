import { useStore } from '../useStore'
import { DoubleSide, Vector3, Quaternion } from 'three'
import { addLine, Program } from '../lang/abstractSyntaxTree'

export const SketchPlane = () => {
  const { ast, setGuiMode, guiMode, updateAst } = useStore(
    ({ guiMode, setGuiMode, ast, updateAst }) => ({
      guiMode,
      setGuiMode,
      ast,
      updateAst,
    })
  )
  if (guiMode.mode !== 'sketch') {
    return null
  }
  if (guiMode.sketchMode !== 'points' && guiMode.sketchMode !== 'sketchEdit') {
    return null
  }

  const sketchGridName = 'sketchGrid'

  let clickDetectQuaternion = guiMode.quaternion.clone()

  let temp = new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    Math.PI / 2
  )
  const gridQuaternion = new Quaternion().multiplyQuaternions(
    guiMode.quaternion,
    temp
  )

  return (
    <>
      <mesh
        quaternion={clickDetectQuaternion}
        name={sketchGridName}
        onClick={(e) => {
          if (guiMode.sketchMode !== 'points') {
            return
          }
          const sketchGridIntersection = e.intersections.find(
            ({ object }) => object.name === sketchGridName
          )
          const inverseQuaternion = clickDetectQuaternion.clone().invert()
          let transformedPoint = sketchGridIntersection?.point.clone()
          if (transformedPoint)
            transformedPoint.applyQuaternion(inverseQuaternion)

          const point = roundy(transformedPoint)
          let _ast: Program = ast
            ? ast
            : {
                type: 'Program',
                start: 0,
                end: 0,
                body: [],
              }
          const addLinePoint: [number, number] = [point.x, point.y]
          const { modifiedAst } = addLine(
            _ast,
            guiMode.pathToNode,
            addLinePoint
          )
          updateAst(modifiedAst)
        }}
      >
        <planeGeometry args={[30, 40]} />
        <meshStandardMaterial
          color="blue"
          side={DoubleSide}
          opacity={0}
          transparent
        />
      </mesh>
      <gridHelper
        args={[30, 40, 'blue', 'hotpink']}
        quaternion={gridQuaternion}
      />
    </>
  )
}

function roundy({ x, y, z }: any) {
  const roundOff = (num: number, places: number): number => {
    const x = Math.pow(10, places)
    return Math.round(num * x) / x
  }
  return {
    x: roundOff(x, 2),
    y: roundOff(y, 2),
    z: roundOff(z, 2),
  }
}